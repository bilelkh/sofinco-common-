export interface SearchHit {
  title?: string;
  link?: string;
  excerpt?: string;
}

export interface SearchSmartResult {
  title?: string;
  description?: string;
  canonicalurl?: string;
}

export interface SearchBlockProps {
  title: string;
  action: string;
  initialQuery: string;
  results: SearchHit[];
  smartResults: SearchSmartResult[];
  nbResults: number;
  smartNbResults: number;
  currentPage: number;
  totalPages: number;
}
