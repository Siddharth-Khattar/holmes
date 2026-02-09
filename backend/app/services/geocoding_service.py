# ABOUTME: Google Maps geocoding service with in-memory caching for converting addresses to coordinates.
# Provides forward/reverse geocoding and batch operations with graceful error handling.

import asyncio
import logging
import os
from typing import Any

import googlemaps
from googlemaps import Client
from googlemaps.exceptions import ApiError, HTTPError, Timeout

logger = logging.getLogger(__name__)


class GeocodingService:
    """Google Maps geocoding service with in-memory caching.

    Provides forward geocoding (address → coordinates), reverse geocoding
    (coordinates → address), and batch operations. All methods are async
    using asyncio.to_thread for non-blocking execution.
    """

    def __init__(self, api_key: str | None = None):
        """Initialize geocoding service.

        Args:
            api_key: Google Maps API key. If None, reads from GOOGLE_MAPS_API_KEY env var.

        Raises:
            ValueError: If API key not provided and not in environment.
        """
        key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not key:
            raise ValueError(
                "Google Maps API key required. Set GOOGLE_MAPS_API_KEY environment variable."
            )

        self.client: Client = googlemaps.Client(key=key)
        self._cache: dict[str, dict[str, float] | None] = {}
        self._reverse_cache: dict[tuple[float, float], str | None] = {}

    @staticmethod
    def _normalize_address(address: str) -> str:
        """Normalize address for consistent caching.

        Args:
            address: Raw address string.

        Returns:
            Normalized address (lowercase, whitespace stripped).
        """
        return address.lower().strip()

    async def geocode_address(self, address: str) -> dict[str, float] | None:
        """Forward geocode: convert address to coordinates.

        Args:
            address: Address or place name to geocode.

        Returns:
            Dictionary with 'lat' and 'lng' keys, or None if geocoding failed.

        Example:
            >>> coords = await service.geocode_address("123 Main St, Springfield, IL")
            >>> print(coords)
            {"lat": 39.7817, "lng": -89.6501}
        """
        normalized = self._normalize_address(address)

        # Check cache first
        if normalized in self._cache:
            logger.debug(f"Cache hit for address: {address}")
            return self._cache[normalized]

        try:
            # Call Google Maps API (blocking, so run in thread)
            result: list[dict[str, Any]] = await asyncio.to_thread(
                self.client.geocode,
                address,  # type: ignore[attr-defined]
            )

            if not result:
                logger.warning(f"No geocoding results for address: {address}")
                self._cache[normalized] = None
                return None

            # Extract lat/lng from first result
            location = result[0]["geometry"]["location"]
            coords = {"lat": location["lat"], "lng": location["lng"]}

            # Cache result
            self._cache[normalized] = coords
            logger.info(f"Geocoded address '{address}' → {coords}")
            return coords

        except (ApiError, HTTPError, Timeout) as e:
            logger.warning(f"Geocoding failed for '{address}': {e}")
            self._cache[normalized] = None
            return None
        except Exception as e:
            logger.error(f"Unexpected geocoding error for '{address}': {e}")
            self._cache[normalized] = None
            return None

    async def reverse_geocode(self, lat: float, lng: float) -> str | None:
        """Reverse geocode: convert coordinates to address.

        Args:
            lat: Latitude.
            lng: Longitude.

        Returns:
            Formatted address string, or None if reverse geocoding failed.

        Example:
            >>> address = await service.reverse_geocode(39.7817, -89.6501)
            >>> print(address)
            "123 Main St, Springfield, IL 62701, USA"
        """
        # Round coordinates to 6 decimal places for cache key
        # (6 decimals = ~0.1m precision, sufficient for caching)
        cache_key = (round(lat, 6), round(lng, 6))

        # Check cache first
        if cache_key in self._reverse_cache:
            logger.debug(f"Cache hit for coordinates: ({lat}, {lng})")
            return self._reverse_cache[cache_key]

        try:
            # Call Google Maps API (blocking, so run in thread)
            result: list[dict[str, Any]] = await asyncio.to_thread(
                self.client.reverse_geocode,
                (lat, lng),  # type: ignore[attr-defined]
            )

            if not result:
                logger.warning(f"No reverse geocoding results for ({lat}, {lng})")
                self._reverse_cache[cache_key] = None
                return None

            # Extract formatted address from first result
            address = result[0]["formatted_address"]

            # Cache result
            self._reverse_cache[cache_key] = address
            logger.info(f"Reverse geocoded ({lat}, {lng}) → '{address}'")
            return address

        except (ApiError, HTTPError, Timeout) as e:
            logger.warning(f"Reverse geocoding failed for ({lat}, {lng}): {e}")
            self._reverse_cache[cache_key] = None
            return None
        except Exception as e:
            logger.error(f"Unexpected reverse geocoding error for ({lat}, {lng}): {e}")
            self._reverse_cache[cache_key] = None
            return None

    async def batch_geocode(
        self, addresses: list[str]
    ) -> list[dict[str, float] | None]:
        """Batch geocode multiple addresses.

        Uses individual geocode_address calls with caching for efficiency.
        Runs geocoding tasks concurrently.

        Args:
            addresses: List of addresses to geocode.

        Returns:
            List of coordinate dicts (or None for failed geocoding),
            in same order as input addresses.

        Example:
            >>> addresses = ["123 Main St, Springfield, IL", "456 Oak Ave, Chicago, IL"]
            >>> results = await service.batch_geocode(addresses)
            >>> print(results)
            [{"lat": 39.78, "lng": -89.65}, {"lat": 41.88, "lng": -87.63}]
        """
        # Run all geocoding tasks concurrently
        tasks = [self.geocode_address(addr) for addr in addresses]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        logger.info(
            f"Batch geocoded {len(addresses)} addresses: "
            f"{sum(1 for r in results if r is not None)}/{len(addresses)} successful"
        )
        return list(results)

    def clear_cache(self) -> None:
        """Clear all cached geocoding results.

        Useful for testing or if cache grows too large.
        """
        self._cache.clear()
        self._reverse_cache.clear()
        logger.info("Geocoding cache cleared")

    def get_cache_stats(self) -> dict[str, int]:
        """Get cache statistics.

        Returns:
            Dictionary with cache sizes.
        """
        return {
            "forward_cache_size": len(self._cache),
            "reverse_cache_size": len(self._reverse_cache),
        }
