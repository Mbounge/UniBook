//src/components/editor/templates/index.ts

// Each variant has a name for the UI and the HTML content to be inserted.
// The HTML uses Tailwind CSS classes, which will be correctly applied by the editor.
export interface TemplateVariant {
    name: string;
    html: string;
  }
  
  // Each category has a name and a collection of variants.
  export interface TemplateCategory {
    categoryName: string;
    variants: TemplateVariant[];
  }
  
  export const editorTemplates: TemplateCategory[] = [
    {
      categoryName: "Callouts & Highlights",
      variants: [
        {
          name: "Learning Objectives",
          html: `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-6 my-4 rounded-r-lg">
              <h3 class="text-lg font-bold text-blue-800 mt-0 mb-3">Learning Objectives</h3>
              <ul class="list-disc pl-5 space-y-1 text-blue-900">
                <li>Describe the first key concept.</li>
                <li>Explain the second important theory.</li>
                <li>Analyze the third primary topic.</li>
              </ul>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Key Takeaway",
          html: `
            <div class="bg-green-50 border-l-4 border-green-500 p-6 my-4 rounded-r-lg">
              <h3 class="text-lg font-bold text-green-800 mt-0 mb-3">Key Takeaway</h3>
              <p class="text-green-900 m-0">This is the most important conclusion from the preceding section. Summarize the critical point here.</p>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Definition Box",
          html: `
            <div class="bg-gray-100 p-6 my-4 rounded-lg border border-gray-200">
              <h4 class="text-base font-bold text-gray-800 mt-0 mb-2">DEFINITION</h4>
              <p class="text-gray-700 m-0"><strong>Term:</strong> Write the term being defined here.</p>
              <p class="text-gray-700 m-0"><strong>Definition:</strong> Provide the detailed definition of the term here.</p>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Warning / Caution",
          html: `
            <div class="bg-red-50 border-l-4 border-red-500 p-6 my-4 rounded-r-lg">
              <h3 class="text-lg font-bold text-red-800 mt-0 mb-3">Caution</h3>
              <p class="text-red-900 m-0">Use this to warn students about common mistakes or critical points that require special attention.</p>
            </div>
            <p><br></p>
          `,
        },
      ],
    },
    {
      categoryName: "Lists & Summaries",
      variants: [
        {
          name: "Numbered List with Title",
          html: `
            <div class="my-4">
              <h4 class="text-base font-bold text-gray-800 mt-0 mb-3">Process Steps</h4>
              <ol class="list-decimal pl-5 space-y-2">
                <li>First step of the process.</li>
                <li>Second step of the process.</li>
                <li>Third step of the process.</li>
              </ol>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Checklist",
          html: `
            <div class="my-4 bg-white p-6 rounded-lg border border-gray-200">
              <h4 class="text-base font-bold text-gray-800 mt-0 mb-4">Chapter Checklist</h4>
              <ul class="list-none p-0 space-y-3">
                <li class="flex items-center"><span class="mr-3 text-lg">☐</span> Review key terms.</li>
                <li class="flex items-center"><span class="mr-3 text-lg">☐</span> Complete the practice questions.</li>
                <li class="flex items-center"><span class="mr-3 text-lg">☐</span> Read the case study.</li>
              </ul>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Icon Bullet Points",
          html: `
            <div class="my-4">
              <h4 class="text-base font-bold text-gray-800 mt-0 mb-4">Key Features</h4>
              <ul class="list-none p-0 space-y-3">
                <li class="flex items-start"><span class="mr-3 text-green-500 mt-1">✔</span> <span>Feature one with a detailed description that might wrap to a second line.</span></li>
                <li class="flex items-start"><span class="mr-3 text-green-500 mt-1">✔</span> <span>Feature two is also very important.</span></li>
                <li class="flex items-start"><span class="mr-3 text-green-500 mt-1">✔</span> <span>A third and final feature.</span></li>
              </ul>
            </div>
            <p><br></p>
          `,
        },
      ],
    },
    {
      categoryName: "Layouts",
      variants: [
        {
          name: "Two-Column Text",
          html: `
            <div class="flex gap-8 my-4">
              <div class="w-1/2">
                <h4 class="font-bold">Column One Title</h4>
                <p>Enter your content for the first column here. It's great for comparing and contrasting ideas.</p>
              </div>
              <div class="w-1/2">
                <h4 class="font-bold">Column Two Title</h4>
                <p>Enter your content for the second column here. You can discuss an opposing viewpoint or a related topic.</p>
              </div>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Image Left, Text Right",
          html: `
            <div class="flex items-start gap-6 my-4">
              <div class="w-1/3 flex-shrink-0">
                <img src="https://via.placeholder.com/400x300" alt="Placeholder image" class="rounded-lg w-full">
                <p class="text-xs text-center text-gray-500 mt-2"><em>Your image caption here.</em></p>
              </div>
              <div class="w-2/3">
                <h4 class="font-bold mt-0">Title Beside Image</h4>
                <p>This layout is perfect for introducing a concept visually. The text wraps nicely and stays contained within its column, providing a clean and organized look for your content.</p>
              </div>
            </div>
            <p><br></p>
          `,
        },
        {
          name: "Image Right, Text Left",
          html: `
            <div class="flex items-start gap-6 my-4">
              <div class="w-2/3">
                <h4 class="font-bold mt-0">Title Beside Image</h4>
                <p>This layout is perfect for introducing a concept visually. The text wraps nicely and stays contained within its column, providing a clean and organized look for your content.</p>
              </div>
              <div class="w-1/3 flex-shrink-0">
                <img src="https://via.placeholder.com/400x300" alt="Placeholder image" class="rounded-lg w-full">
                <p class="text-xs text-center text-gray-500 mt-2"><em>Your image caption here.</em></p>
              </div>
            </div>
            <p><br></p>
          `,
        },
      ],
    },
  ];