import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export function usePagination<T>(data: T[], initialItemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Ensure current page is valid when data length or items per page changes
  const validCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, validCurrentPage, itemsPerPage]);

  return {
    currentPage: validCurrentPage,
    itemsPerPage,
    totalPages,
    paginatedData,
    setCurrentPage,
    setItemsPerPage
  };
}

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  itemsPerPageOptions?: number[];
  label?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  label = "عنصر"
}: PaginationControlsProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-neutral-100">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span>عرض</span>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(val) => {
            onItemsPerPageChange(Number(val));
            onPageChange(1); // Reset to first page
          }}
        >
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {itemsPerPageOptions.map(opt => (
              <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{label} لكل صفحة</span>
        <span className="hidden sm:inline-block border-r border-neutral-300 pr-2 mr-2">
          إجمالي: <span className="font-bold text-neutral-900">{totalItems}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-neutral-600 disabled:opacity-30"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronRight className="h-4 w-4" /> {/* RTL: Right goes to previous */}
        </Button>
        <div className="flex items-center gap-1 text-sm font-medium">
          <span className="px-3 py-1 bg-neutral-100 rounded-md text-neutral-900">{currentPage}</span>
          <span className="text-neutral-400">من</span>
          <span className="px-2 py-1 text-neutral-600">{Math.max(1, totalPages)}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-neutral-600 disabled:opacity-30"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronLeft className="h-4 w-4" /> {/* RTL: Left goes to next */}
        </Button>
      </div>
    </div>
  );
}
