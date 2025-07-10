import React, { useState, useEffect } from 'react';
import nunjucks from 'nunjucks';
import { useAppStore } from '../stores/appStore';
import * as datasetApi from '../api/datasets';

const PromptPreview: React.FC = () => {
  const { unsavedTemplate, bindings, datasets, selectedRecord } = useAppStore();
  const [renderedContent, setRenderedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderTemplate = async () => {
      if (!unsavedTemplate) {
        setRenderedContent('');
        return;
      }

      setIsLoading(true);
      setError(null);
      nunjucks.configure({ autoescape: false });

      try {
        var context: Record<string, unknown> = {};

        for (const binding of bindings) {
          const dataset = datasets.find(d => d.id === binding.source_id);
          if (!dataset) continue;

          // Sanitize dataset name to be a valid variable name
          const contextKey = binding.context_key;
          var contextValue = null;

          if (binding.scope === 'record') {
            contextValue = selectedRecord || await datasetApi.getDatasetRecord(binding.source_id, 0);
          } else if (binding.scope === 'global') {
            try {
              const globalRecord = await datasetApi.getDatasetRecord(binding.source_id, binding.row ?? 0);
              contextValue = globalRecord;
            } catch (e) {
                console.error(`Failed to fetch global record for ${dataset.name}:`, e);
                contextValue = { error: `Failed to load row ${binding.row}` };
            }
          }

          if (contextKey === '' && typeof contextValue === 'object') {
            context = { ...context, ...contextValue };
          } else {
            context[contextKey] = contextValue;
          }
        }
        const output = nunjucks.renderString(unsavedTemplate, context);
        setRenderedContent(output);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during rendering.');
        setRenderedContent('');
      } finally {
        setIsLoading(false);
      }
    };

    renderTemplate();
  }, [unsavedTemplate, bindings, datasets, selectedRecord]);

  if (isLoading) {
    return <div className="p-4"><span className="loading loading-spinner"></span></div>;
  }

  if (error) {
    return <div className="p-4 text-error">Error: {error}</div>;
  }

  return (
    <pre className="p-4 whitespace-pre-wrap text-sm">
      {renderedContent}
    </pre>
  );
};

export default PromptPreview;