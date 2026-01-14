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

export interface LeadList {
  id: string;
  name: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onClearFilters: () => void;
  selectedListId: string;
  onListChange: (listId: string) => void;
  leadLists?: LeadList[];
}

const INDUSTRIES = [
  "Software Development",
  "IT Services and IT Consulting",
  "Technology, Information and Internet",
  "Technology, Information and Media",
  "Information Technology and Services",
  "Financial Services",
  "Insurance",
  "Venture Capital and Private Equity Principals",
  "Hospitals and Health Care",
  "Mental Health Care",
  "Biotechnology Research",
  "Medical Equipment Manufacturing",
  "Manufacturing",
  "Automation Machinery Manufacturing",
  "Semiconductor Manufacturing",
  "Defense and Space Manufacturing",
  "Aviation & Aerospace",
  "Real Estate",
  "Advertising Services",
  "Market Research",
  "Human Resources Services",
  "Staffing and Recruiting",
  "Professional Training and Coaching",
  "E-Learning Providers",
  "Education Administration Programs",
  "Data Infrastructure and Analytics",
  "Business Intelligence Platforms",
  "Internet Marketplace Platforms",
  "Social Networking Platforms",
  "Online Audio and Video Media",
  "Internet Publishing",
  "Retail Apparel and Fashion",
  "Food and Beverage Manufacturing",
  "Food & Beverages",
  "Wellness and Fitness Services",
  "Consumer Services",
  "Design Services",
  "Robotics Engineering",
  "Blockchain Services",
  "Climate Data and Analytics",
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
  selectedListId,
  onListChange,
  leadLists = [],
}: FilterPanelProps) {
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;
  const hasActiveFilters = activeFilterCount > 0;

  const hasLists = leadLists.length > 0;

  return (
    <div className="p-4">
      {/* Lead List Selector */}
      <div className="mb-5">
        {hasLists ? (
          <Select value={selectedListId} onValueChange={onListChange}>
            <SelectTrigger className="w-full h-10 bg-sidebar-accent border-sidebar-border font-medium">
              <SelectValue placeholder="All Leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              {leadLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="w-full h-10 px-3 flex items-center bg-sidebar-accent border border-sidebar-border rounded-md font-medium text-sm">
            All Leads
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border mb-5" />

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
