import { useState, useEffect } from 'react';
import { ResponseSelector, ServiceConfig } from '@/client/components/ResponseSelector.js';
import { Copy, Check } from 'lucide-react';

interface ApiResponse {
  responses: Record<string, string>;
  uniqueKeys: Record<string, string>;
  configs?: Record<string, Record<string, Record<string, string | number>>>;
  errors?: Array<{
    service: string;
    error: string;
  }>;
  timestamp: string;
}

export function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [uniqueKeys, setUniqueKeys] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [services, setServices] = useState<Record<string, ServiceConfig>>({});
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleCopyKey = async (keyValue: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleGenerateResponse = async (
    serviceSelections: Record<string, string>,
    configs: Record<string, Record<string, Record<string, string | number>>>
  ) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: serviceSelections,
          configs
        }),
      });

      const data: ApiResponse = await response.json();
      
      if (data.responses && data.uniqueKeys) {
        setUniqueKeys(data.uniqueKeys);
      }
    } catch (error) {
      console.error('Error generating responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Welcome to Mock Service
        </h2>
        <p className="text-muted-foreground">
          Generate realistic mock API responses for testing and development
        </p>
      </div>

      {servicesLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        </div>
      ) : (
        <ResponseSelector
          services={services}
          onGenerate={handleGenerateResponse}
          isLoading={isLoading}
        />
      )}

      {Object.keys(uniqueKeys).length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl bg-card/50 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Unique Keys Generated
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use these keys to access your mock responses
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(uniqueKeys).map(([keyName, keyValue]) => (
                <div
                  key={keyName}
                  className="bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <span className="font-semibold text-sm capitalize text-foreground block mb-1">
                        {keyName}
                      </span>
                      <code className="bg-muted px-3 py-1.5 rounded-md text-sm font-mono text-foreground block break-all">
                        {keyValue}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopyKey(keyValue, keyName)}
                      className="flex-shrink-0 p-2.5 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95"
                      title="Copy to clipboard"
                    >
                      {copiedKey === keyName ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
