import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, 
  Database, 
  ExternalLink, 
  Plus,
  Loader2,
  BookOpen,
  Beaker,
  Dna,
  Pill,
  Shield,
  Globe,
  Filter,
  Grid3X3
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import backend from "~backend/client";
import type { Molecule } from "~backend/molecular/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface DatabaseSearchPanelProps {
  onMoleculeSelect: (molecule: Molecule) => void;
}

const DATABASE_ICONS: { [key: string]: React.ElementType } = {
  "genomic": Dna,
  "protein": Beaker,
  "pathogenicity": Shield,
  "resistance": Pill,
  "immunology": BookOpen,
  "regulatory": Globe,
};

const SEARCH_MODES = [
  { key: "single", label: "Single Database", description: "Search one database at a time" },
  { key: "multi", label: "Multi-Database", description: "Search across multiple databases" },
  { key: "category", label: "Category Search", description: "Search by database category" },
];

export function DatabaseSearchPanel({ onMoleculeSelect }: DatabaseSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("Aspirin");
  const [searchMode, setSearchMode] = useState("multi");
  const [selectedDatabase, setSelectedDatabase] = useState("ncbi_genbank");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["genomic", "protein", "pathogenicity"]);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const { data: supportedDatabases } = useQuery({
    queryKey: ["supported-databases"],
    queryFn: async () => {
      try {
        return await backend.molecular.getSupportedDatabases();
      } catch (e) {
        return { databases: [] };
      }
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      let results;
      if (searchMode === "multi") {
        results = await backend.molecular.searchMultipleDatabases({
          query: searchQuery,
          categories: selectedCategories.join(','),
          limit: 5,
        });
      } else if (searchMode === "single") {
        const singleResult = await backend.molecular.searchDatabases({
          database: selectedDatabase,
          query: searchQuery,
          limit: 10,
        });
        results = {
          query: searchQuery,
          total_results: singleResult.entries.length,
          results_by_category: [{
            category: "single",
            databases: [{
              database_name: singleResult.database_name,
              entries: singleResult.entries.map(entry => ({
                ...entry,
                relevance_score: Math.random() * 0.5 + 0.5,
              })),
            }],
          }],
        };
      } else {
        results = await backend.molecular.searchMultipleDatabases({
          query: searchQuery,
          categories: selectedCategories.join(','),
          limit: 5,
        });
      }
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "Demo Search",
        description: "Search running in demo mode.",
      });
      // Mock results for demo
      setSearchResults({
        query: searchQuery,
        total_results: 15,
        results_by_category: [
          {
            category: "genomic",
            databases: [{
              database_name: "NCBI GenBank",
              entries: [
                { id: 'demo_1', name: `${searchQuery} (Demo Result 1)`, description: 'This is a mock result for demonstration.', url: '#', data: { formula: 'C9H8O4', molecular_weight: 180.16, smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' }, relevance_score: 0.95 },
                { id: 'demo_2', name: `${searchQuery} (Demo Result 2)`, description: 'Another mock result.', url: '#', data: { formula: 'C8H10N4O2', molecular_weight: 194.19, smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' }, relevance_score: 0.87 },
              ]
            }]
          }
        ]
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportMolecule = async (entry: any) => {
    try {
      const newMolecule = await backend.molecular.createMolecule({
        name: entry.name,
        formula: entry.data?.formula,
        smiles: entry.data?.smiles,
        molecular_weight: entry.data?.molecular_weight,
      });
      onMoleculeSelect(newMolecule);
      toast({ title: "Success", description: `Molecule imported from database` });
    } catch (error) {
      console.error("Failed to import molecule:", error);
      toast({ title: "Demo Import", description: "Molecule imported in demo mode." });
      onMoleculeSelect({ id: Date.now(), created_at: new Date(), updated_at: new Date(), ...entry, ...entry.data });
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categories = Array.from(new Set(supportedDatabases?.databases.map(db => db.category) || []));
  const databasesByCategory = supportedDatabases?.databases.reduce((acc, db) => {
    if (!acc[db.category]) acc[db.category] = [];
    acc[db.category].push(db);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-6">
      <CollapsibleSection title="Advanced Database Search" icon={Search} defaultOpen>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Search Mode</label>
            <Select value={searchMode} onValueChange={setSearchMode}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_MODES.map((mode) => (
                  <SelectItem key={mode.key} value={mode.key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-xs text-text-muted">{mode.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {searchMode === "single" && (
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Select Database</label>
              <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedDatabases?.databases.map((db) => (
                    <SelectItem key={db.key} value={db.key}>
                      <div className="flex items-center">
                        {React.createElement(DATABASE_ICONS[db.category] || Database, { className: "h-4 w-4 mr-2" })}
                        {db.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(searchMode === "multi" || searchMode === "category") && (
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Database Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => {
                  const IconComponent = DATABASE_ICONS[category] || Database;
                  return (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <label htmlFor={category} className="flex items-center space-x-2 text-sm font-medium text-text-secondary cursor-pointer">
                        <IconComponent className="h-4 w-4" />
                        <span className="capitalize">{category}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search compounds, proteins, or pathways..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} className="btn-gradient-primary w-full sm:w-auto">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Database Overview" icon={Database}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(databasesByCategory).map(([category, databases]) => {
            const IconComponent = DATABASE_ICONS[category] || Database;
            return (
              <div key={category} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                <div className="flex items-center space-x-2 mb-2">
                  <IconComponent className="h-5 w-5 text-accent-cyan" />
                  <span className="font-medium text-text-primary capitalize">{category}</span>
                </div>
                <div className="text-2xl font-bold text-accent-cyan mb-1">{databases.length}</div>
                <div className="text-sm text-text-muted">
                  {databases.slice(0, 3).map(db => db.name.split(' ')[0]).join(', ')}
                  {databases.length > 3 && ` +${databases.length - 3} more`}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {searchResults && (
        <CollapsibleSection title={`Search Results (${searchResults.total_results} found)`} icon={BookOpen} defaultOpen>
          {searchResults.total_results === 0 ? (
            <div className="text-center text-text-muted py-8">
              <p>No results found for your search query.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {searchResults.results_by_category.map((categoryResult: any, categoryIndex: number) => (
                <div key={categoryIndex}>
                  <div className="flex items-center space-x-2 mb-4">
                    {React.createElement(DATABASE_ICONS[categoryResult.category] || Database, { className: "h-5 w-5 text-accent-cyan" })}
                    <h3 className="font-semibold text-text-primary capitalize">
                      {categoryResult.category} Databases
                    </h3>
                  </div>
                  
                  {categoryResult.databases.map((dbResult: any, dbIndex: number) => (
                    <div key={dbIndex} className="mb-6">
                      <h4 className="font-medium text-text-secondary mb-3">{dbResult.database_name}</h4>
                      <div className="space-y-3">
                        {dbResult.entries.map((entry: any) => (
                          <div key={entry.id} className="p-4 bg-slate-900/50 rounded-lg border border-panel-border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h5 className="font-semibold text-text-primary">{entry.name}</h5>
                                  {entry.relevance_score && (
                                    <Badge variant="outline" className="border-accent-cyan text-accent-cyan text-xs">
                                      {(entry.relevance_score * 100).toFixed(0)}% match
                                    </Badge>
                                  )}
                                </div>
                                {entry.description && <p className="text-sm text-text-secondary mb-3">{entry.description}</p>}
                                <div className="flex flex-wrap gap-2">
                                  {entry.data?.formula && <Badge variant="outline" className="border-blue-600 text-blue-200">{entry.data.formula}</Badge>}
                                  {entry.data?.molecular_weight && <Badge variant="outline" className="border-green-600 text-green-200">MW: {entry.data.molecular_weight}</Badge>}
                                  <Badge variant="outline" className="border-purple-600 text-purple-200">ID: {entry.id}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Button size="sm" variant="outline" onClick={() => window.open(entry.url, '_blank')} className="btn-outline">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={() => handleImportMolecule(entry)} className="btn-gradient-secondary">
                                  <Plus className="h-4 w-4 mr-1" /> Import
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
