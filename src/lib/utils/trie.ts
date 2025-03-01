import { Company, SearchResult } from '@/types';

// Trie node structure
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  companies: SearchResult[];
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.companies = [];
  }
}

export class Trie {
  root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  // Insert a company into the trie
  insert(company: Company): void {
    // Insert by symbol
    this._insertWord(company.symbol.toLowerCase(), {
      symbol: company.symbol,
      name: company.name,
    });
    
    // Insert by name (words)
    const nameWords = company.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 2) { // Skip very short words
        this._insertWord(word, {
          symbol: company.symbol,
          name: company.name,
        });
      }
    }
  }
  
  // Helper method to insert a word
  private _insertWord(word: string, company: SearchResult): void {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      
      node = node.children.get(char)!;
    }
    
    node.isEndOfWord = true;
    
    // Add company to this node if not already present
    if (!node.companies.some(c => c.symbol === company.symbol)) {
      node.companies.push(company);
    }
  }
  
  // Search for companies by prefix
  search(prefix: string, limit: number = 10): SearchResult[] {
    prefix = prefix.toLowerCase();
    let node = this.root;
    
    // Navigate to the node corresponding to the prefix
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return []; // Prefix not found
      }
      
      node = node.children.get(char)!;
    }
    
    // Collect all companies under this node
    const results: SearchResult[] = [];
    this._collectCompanies(node, results, limit);
    
    return results;
  }
  
  // Helper method to collect all companies under a node
  private _collectCompanies(
    node: TrieNode,
    results: SearchResult[],
    limit: number
  ): void {
    // Add companies at current node
    for (const company of node.companies) {
      if (!results.some(c => c.symbol === company.symbol) && results.length < limit) {
        results.push(company);
      }
      
      if (results.length >= limit) {
        return;
      }
    }
    
    // Recursively explore all children
    for (const [_, childNode] of node.children) {
      this._collectCompanies(childNode, results, limit);
      
      if (results.length >= limit) {
        return;
      }
    }
  }
  
  // Build trie from a list of companies
  static buildFromCompanies(companies: Company[]): Trie {
    const trie = new Trie();
    
    for (const company of companies) {
      trie.insert(company);
    }
    
    return trie;
  }
} 