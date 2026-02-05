import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { 
  Upload, 
  FileText, 
  File, 
  Download, 
  Trash2, 
  Search, 
  X, 
  ArrowLeft,
  Calendar,
  Target,
  BookOpen,
  Folder,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Coach } from '@/lib/typeAdapters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  uploadDate: Date;
  uploadedBy: string;
  fileData: string;
}

type DocumentCategory = 
  | 'Session Plans'
  | 'Competition Calendars'
  | 'Training Programs'
  | 'Meet Results'
  | 'Meeting Notes'
  | 'Other';

interface HandbookProps {
  coach: Coach;
  onBack: () => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Session Plans',
  'Competition Calendars',
  'Training Programs',
  'Meet Results',
  'Meeting Notes',
  'Other',
];

const CATEGORY_ICONS: Record<DocumentCategory, React.ElementType> = {
  'Session Plans': Target,
  'Competition Calendars': Calendar,
  'Training Programs': BookOpen,
  'Meet Results': Trophy,
  'Meeting Notes': FileText,
  'Other': Folder,
};

export function Handbook({ coach, onBack }: HandbookProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Session Plans');
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('handbook_documents');
    if (stored) {
      const parsed = JSON.parse(stored);
      setDocuments(parsed.map((doc: Document) => ({
        ...doc,
        uploadDate: new Date(doc.uploadDate),
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('handbook_documents', JSON.stringify(documents));
  }, [documents]);

  const handleFileUpload = async (files: FileList | null, category: DocumentCategory) => {
    if (!files) return;

    const newDocuments: Document[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string;
        
        const newDoc: Document = {
          id: `${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          category,
          uploadDate: new Date(),
          uploadedBy: `${coach.firstName} ${coach.lastName}`,
          fileData,
        };

        newDocuments.push(newDoc);
        
        if (newDocuments.length === files.length) {
          setDocuments(prev => [...prev, ...newDocuments]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files, uploadCategory);
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    setDeleteConfirmId(null);
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.name;
    link.click();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('word') || type.includes('document')) return FileText;
    if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const getCategoryColor = (category: DocumentCategory) => {
    const colors: Record<DocumentCategory, string> = {
      'Session Plans': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Competition Calendars': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Training Programs': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Meet Results': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Meeting Notes': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[category];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
          data-testid="button-back-handbook"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate" data-testid="text-handbook-title">Handbook</h1>
        </div>
        <Badge variant="secondary" className="hidden sm:flex shrink-0" data-testid="badge-document-count">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <button
          onClick={() => setIsUploadExpanded(!isUploadExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          data-testid="button-toggle-upload"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Upload Documents</span>
          </div>
          {isUploadExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {isUploadExpanded && (
          <div className="p-6 pt-0 space-y-4">
            <div>
              <Label>Upload Category</Label>
              <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as DocumentCategory)}>
                <SelectTrigger className="mt-2" data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => {
                    const Icon = CATEGORY_ICONS[category];
                    return (
                      <SelectItem key={category} value={category} data-testid={`select-item-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              data-testid="dropzone-upload"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports PDF, Word, Excel documents
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileUpload(e.target.files, uploadCategory)}
                data-testid="input-file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer" data-testid="button-choose-files">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </label>
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-search-documents"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all-categories">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                All Categories
              </div>
            </SelectItem>
            {CATEGORIES.map(category => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <SelectItem key={category} value={category} data-testid={`select-filter-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-empty-state">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">
            {searchQuery || selectedCategory !== 'all' 
              ? 'No documents found'
              : 'No documents yet'
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try a different search or filter'
              : 'Upload your first document to get started'
            }
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-documents">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.type);
            const CategoryIcon = CATEGORY_ICONS[doc.category];
            
            return (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow" data-testid={`card-document-${doc.id}`}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" title={doc.name} data-testid={`text-document-name-${doc.id}`}>
                        {doc.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>

                  <Badge className={cn("text-xs", getCategoryColor(doc.category))} data-testid={`badge-category-${doc.id}`}>
                    <CategoryIcon className="h-3 w-3 mr-1" />
                    {doc.category}
                  </Badge>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Uploaded by {doc.uploadedBy}</div>
                    <div>{format(doc.uploadDate, 'MMM dd, yyyy')}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPreviewDocument(doc)}
                      data-testid={`button-preview-${doc.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col" data-testid="dialog-preview">
          <DialogHeader className="shrink-0">
            <div className="flex items-start gap-3">
              <DialogTitle className="flex-1" data-testid="text-preview-title">{previewDocument?.name}</DialogTitle>
              {previewDocument && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {previewDocument.type.includes('pdf') ? 'PDF' : 
                   previewDocument.type.includes('sheet') || previewDocument.type.includes('excel') || previewDocument.type.includes('spreadsheet') ? 'Excel' :
                   previewDocument.type.includes('word') || previewDocument.type.includes('document') ? 'Word' : 'Document'}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {previewDocument && (
                <>
                  {previewDocument.category} • Uploaded by {previewDocument.uploadedBy} on {format(previewDocument.uploadDate, 'MMM dd, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {previewDocument && (
              <DocumentPreview document={previewDocument} />
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewDocument && handleDownload(previewDocument)}
              data-testid="button-preview-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDocument(null)}
              className="ml-auto"
              data-testid="button-preview-close"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentPreview({ document }: { document: Document }) {
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  if (document.type.includes('pdf')) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 relative" data-testid="preview-pdf">
        {pdfLoading && !pdfError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {pdfError ? (
          <div className="text-center p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              PDF preview not available
            </p>
            <p className="text-sm text-muted-foreground">
              Click Download to view the file
            </p>
          </div>
        ) : (
          <iframe
            src={document.fileData}
            className="w-full h-full border-0"
            title={document.name}
            onLoad={() => setPdfLoading(false)}
            onError={() => {
              setPdfLoading(false);
              setPdfError(true);
            }}
          />
        )}
      </div>
    );
  }

  if (document.type.includes('sheet') || document.type.includes('excel') || document.type.includes('spreadsheet')) {
    return <ExcelPreview document={document} />;
  }

  if (document.type.includes('word') || (document.type.includes('document') && !document.type.includes('spreadsheet'))) {
    return <WordPreview document={document} />;
  }

  return (
    <div className="text-center p-8" data-testid="preview-unsupported">
      <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}

function ExcelPreview({ document }: { document: Document }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState(false);

  const workbookData = useMemo(() => {
    try {
      const base64Data = document.fileData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheets: { name: string; data: string[][] }[] = [];
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        sheets.push({
          name: sheetName,
          data: jsonData as string[][],
        });
      });
      
      return sheets;
    } catch (e) {
      console.error('Error parsing Excel file:', e);
      setError(true);
      return [];
    }
  }, [document.fileData]);

  if (error || workbookData.length === 0) {
    return (
      <div className="text-center p-8" data-testid="preview-excel-error">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Unable to preview this Excel file
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Excel
        </p>
      </div>
    );
  }

  const currentSheet = workbookData[activeSheet];

  return (
    <div className="w-full h-full flex flex-col" data-testid="preview-excel">
      {workbookData.length > 1 && (
        <div className="flex gap-1 p-2 border-b bg-muted/30 overflow-x-auto shrink-0">
          {workbookData.map((sheet, index) => (
            <Button
              key={sheet.name}
              variant={activeSheet === index ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSheet(index)}
              className="shrink-0"
              data-testid={`button-sheet-${index}`}
            >
              {sheet.name}
            </Button>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto">
        {currentSheet.data.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            This sheet is empty
          </div>
        ) : (
          <table className="w-full border-collapse text-sm" data-testid="table-excel-data">
            <tbody>
              {currentSheet.data.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-muted/50 font-medium" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="border border-border px-3 py-2 whitespace-nowrap"
                    >
                      {cell !== undefined && cell !== null ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WordPreview({ document }: { document: Document }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const convertDocument = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        const base64Data = document.fileData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        setHtmlContent(result.value);
      } catch (e) {
        console.error('Error converting Word document:', e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    convertDocument();
  }, [document.fileData]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center" data-testid="preview-word-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div className="text-center p-8" data-testid="preview-word-error">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Unable to preview this Word document
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Word
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full overflow-auto p-6 bg-white dark:bg-gray-900 prose prose-sm dark:prose-invert max-w-none"
      data-testid="preview-word"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
