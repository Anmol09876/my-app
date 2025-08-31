'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calculator from '@/components/calculator/Calculator';
import CasCalculator from '@/components/calculator/CasCalculator';
import GraphCalculator from '@/components/calculator/GraphCalculator';
import MatrixCalculator from '@/components/calculator/MatrixCalculator';
import StatsCalculator from '@/components/calculator/StatsCalculator';
import UnitsConverter from '@/components/calculator/UnitsConverter';
import ProgrammingCalculator from '@/components/calculator/ProgrammingCalculator';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gradient-to-b from-background to-muted/50">
      <div className="w-full max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 tracking-tight">Scientific Calculator</h1>
          <ThemeToggle />
        </div>
        
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 mb-4 p-1 gap-1">
            <TabsTrigger value="calculator" className="font-medium">Calculator</TabsTrigger>
            <TabsTrigger value="cas" className="font-medium">CAS</TabsTrigger>
            <TabsTrigger value="graph" className="font-medium">Graph</TabsTrigger>
            <TabsTrigger value="matrix" className="font-medium">Matrix</TabsTrigger>
            <TabsTrigger value="stats" className="font-medium">Stats</TabsTrigger>
            <TabsTrigger value="units" className="font-medium">Units</TabsTrigger>
            <TabsTrigger value="programming" className="font-medium">Programs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="mt-0">
            <Calculator />
          </TabsContent>
          
          <TabsContent value="cas" className="mt-0">
            <CasCalculator />
          </TabsContent>
          
          <TabsContent value="graph" className="mt-0">
            <GraphCalculator />
          </TabsContent>
          
          <TabsContent value="matrix" className="mt-0">
            <MatrixCalculator />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-0">
            <StatsCalculator />
          </TabsContent>
          
          <TabsContent value="units" className="mt-0">
            <UnitsConverter />
          </TabsContent>
          
          <TabsContent value="programming" className="mt-0">
            <ProgrammingCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}