"use client";

import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Filters {
  search: string;
  industry: string;
  employee_range: string;
  country: string;
  title: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onClearFilters: () => void;
}

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Education",
  "Real Estate",
  "Media",
  "Consulting",
  "Other",
];

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Australia",
  "India",
  "Singapore",
  "Netherlands",
  "Other",
];

export function FilterPanel({
  filters,
  onFilterChange,
  onClearFilters,
}: FilterPanelProps) {
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Name, company, title..."
              className="pl-9 h-9 bg-input border-border"
            />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry" className="text-xs font-medium text-muted-foreground">
            Industry
          </Label>
          <Select
            value={filters.industry}
            onValueChange={(value) => onFilterChange("industry", value === "all" ? "" : value)}
          >
            <SelectTrigger id="industry" className="w-full h-9 bg-input border-border">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee Range */}
        <div className="space-y-2">
          <Label htmlFor="employee_range" className="text-xs font-medium text-muted-foreground">
            Company Size
          </Label>
          <Select
            value={filters.employee_range}
            onValueChange={(value) => onFilterChange("employee_range", value === "all" ? "" : value)}
          >
            <SelectTrigger id="employee_range" className="w-full h-9 bg-input border-border">
              <SelectValue placeholder="All sizes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              {EMPLOYEE_RANGES.map((range) => (
                <SelectItem key={range} value={range}>
                  {range} employees
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-xs font-medium text-muted-foreground">
            Country
          </Label>
          <Select
            value={filters.country}
            onValueChange={(value) => onFilterChange("country", value === "all" ? "" : value)}
          >
            <SelectTrigger id="country" className="w-full h-9 bg-input border-border">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-border" />

        {/* Title Search */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
            Job Title
          </Label>
          <Input
            id="title"
            value={filters.title}
            onChange={(e) => onFilterChange("title", e.target.value)}
            placeholder="e.g. VP, Director, Manager..."
            className="h-9 bg-input border-border"
          />
        </div>
      </div>
    </div>
  );
}
