//src/components/editor/GraphBlock.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Settings, Trash2 } from 'lucide-react';

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface GraphData {
  type: 'bar' | 'line';
  width: number;
  height: number;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
  };
  options: ChartOptions<'bar'> | ChartOptions<'line'>;
}

interface GraphBlockProps {
  initialGraphData: GraphData;
  onUpdate: (newGraphData: GraphData) => void;
  onRemove: () => void;
}

export const GraphBlock: React.FC<GraphBlockProps> = ({ 
  initialGraphData, 
  onUpdate, 
  onRemove,
}) => {
  const [graphData, setGraphData] = useState(initialGraphData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartKey, setChartKey] = useState(0); // Force chart re-render
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  // This effect listens for a custom event dispatched by the GraphResizer
  // to update its internal state with the new dimensions.
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleUpdate = (e: CustomEvent<GraphData>) => {
      const newGraphData = e.detail;
      setGraphData(newGraphData);
      
      // Force chart to resize by incrementing the key - this completely re-creates the chart
      setChartKey(prev => prev + 1);
      
      // Multiple fallback strategies to ensure proper resizing
      setTimeout(() => {
        // Try direct chart resize
        if (chartRef.current) {
          try {
            chartRef.current.resize();
          } catch (error) {
            console.warn('Chart resize method failed:', error);
          }
        }
        
        // Force another key increment if the first one didn't work
        setTimeout(() => {
          setChartKey(prev => prev + 1);
        }, 100);
      }, 50);
    };

    const parentWrapper = container.parentElement;
    parentWrapper?.addEventListener('updateGraph', handleUpdate as EventListener);

    return () => {
      parentWrapper?.removeEventListener('updateGraph', handleUpdate as EventListener);
    };
  }, []);

  // Add ResizeObserver to watch for container size changes
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // When container size changes, force chart re-render
      if (chartRef.current) {
        setTimeout(() => {
          try {
            chartRef.current?.resize();
            chartRef.current?.update('none'); // Update without animation
          } catch (error) {
            console.warn('ResizeObserver chart update failed:', error);
            // Force re-render as fallback
            setChartKey(prev => prev + 1);
          }
        }, 10);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // This effect calls the onUpdate prop to save changes to the DOM dataset
  useEffect(() => {
    onUpdate(graphData);
  }, [graphData, onUpdate]);

  const renderChart = () => {
    const responsiveOptions = {
      ...graphData.options,
      responsive: true,
      maintainAspectRatio: false,
    };

    const handleChartRef = (ref: any) => {
      chartRef.current = ref;
    };

    switch (graphData.type) {
      case 'bar':
        return (
          <Bar 
            key={chartKey}
            ref={handleChartRef}
            options={responsiveOptions as ChartOptions<'bar'>} 
            data={graphData.data}
          />
        );
      case 'line':
        return (
          <Line 
            key={chartKey}
            ref={handleChartRef}
            options={responsiveOptions as ChartOptions<'line'>} 
            data={graphData.data}
          />
        );
      default:
        return <p>Unknown chart type</p>;
    }
  };

  return (
    <div
      ref={chartContainerRef}
      style={{ 
        width: `${graphData.width}px`, 
        height: `${graphData.height}px`,
        overflow: 'hidden' // Prevent chart from overflowing container
      }}
      className="relative p-4 border border-gray-200 rounded-lg group transition-all duration-200"
    >
      <div 
        style={{ 
          width: `${graphData.width - 32}px`, // Account for padding (16px on each side)
          height: `${graphData.height - 32}px`, // Account for padding (16px on each side)
          position: 'relative'
        }}
      >
        {renderChart()}
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-white/80 backdrop-blur-sm rounded-md shadow-md hover:bg-gray-100"
          title="Customize Graph"
        >
          <Settings className="w-4 h-4 text-gray-700" />
        </button>
        <button 
          onClick={onRemove}
          className="p-2 bg-white/80 backdrop-blur-sm rounded-md shadow-md hover:bg-red-100"
          title="Remove Graph"
          data-remove-button="true"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-white p-4 z-10 border rounded-lg shadow-lg flex flex-col">
          <h4 className="font-bold mb-2 flex-shrink-0">Customize Graph</h4>
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-gray-600">A full customization UI could be built here, allowing users to change colors, labels, data, etc.</p>
          </div>
          <button onClick={() => setIsModalOpen(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex-shrink-0">
            Done
          </button>
        </div>
      )}
    </div>
  );
};