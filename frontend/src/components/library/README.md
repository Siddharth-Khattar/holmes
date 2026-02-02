# Evidence Library Component

## Overview

The **Evidence Library** is a centralized file management interface that provides investigators with a comprehensive view of all evidence files associated with a case. It serves as the primary hub for managing, organizing, filtering, and accessing multi-modal evidence files throughout the investigation lifecycle.

## Features

### 1. File Management

- **Centralized View**: Single location to view all case-related files
- **Multi-format Support**: Handles PDFs, videos, audio recordings, and images
- **File Actions**: View, download, delete, and more options for each file

### 2. Organization & Filtering

- **Category Filters**:
  - All (default view)
  - Evidence (primary evidence files)
  - Legal (statutes, regulations, case law)
  - Strategy (internal strategy documents)
  - Reference (supporting materials)
- **Search**: Real-time search by filename
- **Visual Indicators**: Color-coded category badges

### 3. Status Tracking

- **Ready** (Green): File processed and available
- **Processing** (Blue): File being analyzed with progress bar
- **Conflict** (Amber): Contradictions detected with other files
- **Error** (Red): Processing failed or file corrupted

### 4. Conflict Detection

- **Automatic Detection**: Identifies contradictions between files
- **Conflict Types**:
  - Duplicate: Same file uploaded multiple times
  - Contradiction: Conflicting information between files
  - Version: Multiple versions of the same document
- **Resolution Actions**:
  - View Side-by-Side
  - Trust New
  - Keep Existing
  - Flag for Review

### 5. Drag & Drop Upload

- Visual feedback during drag operation
- Supports multiple file selection
- Highlighted drop zone when files are dragged over

## Component Structure

```
library/
├── CaseLibrary.tsx    # Main component
├── index.ts           # Export file
└── README.md          # This file
```

## Usage

### As a Page Route

The Evidence Library is accessible as a dedicated page within each case:

```
/cases/[id]/library
```

### Component Props

```typescript
interface CaseLibraryProps {
  caseId: string; // Current case identifier
  caseName?: string; // Optional case name for display
}
```

### Example

```tsx
import { CaseLibrary } from "@/components/library";

export default function LibraryPage() {
  return (
    <CaseLibrary caseId="case-123" caseName="Offshore Holdings Investigation" />
  );
}
```

## Data Model

### LibraryFile Interface

```typescript
interface LibraryFile {
  id: string; // Unique file identifier
  name: string; // Display name
  type: SupportedFileType; // "pdf" | "video" | "audio" | "image"
  size: number; // File size in bytes
  url: string; // File location
  category: FileCategory; // File category
  status: FileStatus; // Processing status
  processingProgress?: number; // 0-100 for processing files
  conflictInfo?: ConflictInfo; // Conflict details if applicable
  uploadedAt: Date; // Upload timestamp
}
```

### File Categories

- `all`: Shows all files (filter option)
- `evidence`: Primary evidence files
- `legal`: Legal documents and statutes
- `strategy`: Internal strategy documents
- `reference`: Supporting reference materials

### File Status

- `ready`: File is processed and available
- `processing`: File is being analyzed (shows progress bar)
- `conflict`: Contradictions detected with other files
- `error`: Processing failed or file is corrupted

## Design System Integration

The Evidence Library follows the Holmes design system:

### Color Scheme

- Supports both light and dark modes
- Uses CSS variables for theming:
  - `--background`: Main background
  - `--foreground`: Primary text
  - `--muted`: Secondary backgrounds
  - `--muted-foreground`: Secondary text
  - `--border`: Border colors
  - `--accent`: Accent color for active states

### Category Badge Colors

**Dark Mode:**

- Evidence: Blue (`bg-blue-900/30 text-blue-300`)
- Legal: Purple (`bg-purple-900/30 text-purple-300`)
- Strategy: Green (`bg-green-900/30 text-green-300`)
- Reference: Amber (`bg-amber-900/30 text-amber-300`)

**Light Mode:**

- Evidence: Blue (`bg-blue-100 text-blue-800`)
- Legal: Purple (`bg-purple-100 text-purple-800`)
- Strategy: Green (`bg-green-100 text-green-800`)
- Reference: Amber (`bg-amber-100 text-amber-800`)

### Animations

Uses Framer Motion for smooth transitions:

- File list items fade in with staggered delay
- Conflict alert slides in/out smoothly
- Hover states on interactive elements

## Navigation Integration

The Evidence Library is integrated into the case navigation tabs:

```tsx
// In case layout
const navItems = [
  { title: "Command Center", icon: Terminal, href: "/command-center" },
  { title: "Knowledge Graph", icon: Network, href: "/knowledge-graph" },
  { title: "Evidence Library", icon: FolderOpen, href: "/library" },
  { title: "Upload", icon: Upload, href: "/upload" },
  { title: "Timeline", icon: Clock, href: "/timeline" },
];
```

## File Actions

### View File

Opens the file in the Source Panel for detailed analysis.

```typescript
const handleViewFile = (file: LibraryFile) => {
  // TODO: Integrate with SourcePanelContext
  // openSource(convertToSourceFile(file));
};
```

### Download File

Triggers file download to user's device.

```typescript
const handleDownloadFile = (file: LibraryFile) => {
  // TODO: Implement download logic
  // window.open(file.url, '_blank');
};
```

### Delete File

Removes file from the case.

```typescript
const handleDeleteFile = (file: LibraryFile) => {
  // TODO: Implement delete API call
  // await api.delete(`/api/cases/${caseId}/files/${file.id}`);
};
```

## Mock Data

Currently uses mock data for demonstration. In production, replace with API calls:

```typescript
// Fetch files on mount
useEffect(() => {
  async function fetchFiles() {
    const data = await api.get(`/api/cases/${caseId}/files`);
    setFiles(data);
  }
  fetchFiles();
}, [caseId]);
```

## Future Enhancements

### Planned Features

1. **Bulk Actions**: Select multiple files for batch operations
2. **File Preview**: Thumbnail or quick preview on hover
3. **Advanced Filters**: Filter by date, size, processing status
4. **Sort Options**: Sort by name, date, size, status
5. **File Tagging**: Custom tags for organization
6. **File Relationships**: Show which files reference each other
7. **Version History**: Track file versions and changes
8. **Collaboration**: Show who uploaded/modified files
9. **Export**: Export file list as CSV or PDF
10. **Analytics**: File processing statistics and insights

### Conflict Resolution Workflow

Future implementation should include:

1. **Side-by-side comparison**: Visual diff of conflicting content
2. **Merge tool**: Combine information from multiple sources
3. **Audit trail**: Track conflict resolution decisions
4. **Confidence scoring**: Show AI confidence in each version
5. **Expert review**: Flag for human expert review

## API Integration

### Endpoints Required

```typescript
// Get all files for a case
GET /api/cases/:caseId/files
Response: LibraryFile[]

// Upload files
POST /api/cases/:caseId/files
Body: FormData with files
Response: LibraryFile[]

// Delete file
DELETE /api/cases/:caseId/files/:fileId
Response: { success: boolean }

// Download file
GET /api/cases/:caseId/files/:fileId/download
Response: File blob

// Resolve conflict
POST /api/cases/:caseId/files/:fileId/resolve-conflict
Body: { resolution: string, action: string }
Response: LibraryFile
```

### Real-time Updates

Use Server-Sent Events (SSE) for real-time status updates:

```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/cases/${caseId}/files/events`);

  eventSource.addEventListener("file-processing-update", (event) => {
    const data = JSON.parse(event.data);
    updateFileStatus(data.fileId, data.status, data.progress);
  });

  return () => eventSource.close();
}, [caseId]);
```

## Performance Considerations

### For Large Case Files (100+ files)

1. **Virtual Scrolling**: Use `react-window` for table virtualization
2. **Pagination**: Implement server-side pagination
3. **Lazy Loading**: Load file metadata on demand
4. **Debounced Search**: Delay search execution to reduce re-renders

### Optimization Example

```typescript
// Debounced search
const debouncedSearch = useMemo(
  () =>
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
  [],
);
```

## Accessibility

### Keyboard Navigation

- Tab through files
- Enter to view file
- Arrow keys to navigate table

### Screen Reader Support

- ARIA labels for all actions
- Semantic HTML structure
- Status announcements

### Focus Management

- Proper focus indicators
- Focus trap in modals
- Return focus on close

## Testing

### Unit Tests

- Filtering logic (category and search)
- File actions (view, download, delete)
- Drag and drop functionality
- Status rendering
- Conflict display

### Integration Tests

- Source Panel integration
- Upload integration
- Modal behavior

### Accessibility Tests

- Keyboard navigation
- Screen reader compatibility
- Focus management

## Related Components

- **Source Panel**: For viewing file details
- **Upload Hub**: For dedicated upload interface
- **Command Center**: Main case workspace
- **Knowledge Graph**: Entity and relationship visualization

## Support

For questions or issues, refer to:

- [Command Center Implementation Guide](../../DEVELOPMENT_DOCS/COMMAND-CENTER-GUIDE.md)
- [Source Panel Technical Specification](../../DEVELOPMENT_DOCS/EVIDENCE-SOURCE-PANEL.md)
- [Design System Documentation](../../DOCS/UI/DESIGN-SYSTEM.md)
