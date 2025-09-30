

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const booksDir = path.join(process.cwd(), 'src', 'books');
const outputDir = path.join(process.cwd(), 'public', 'books'); // Output to public folder for web access
const bookPdf = 'PrinciplesOfFinance.pdf';
// ---------------------

async function main() {
  console.log('Starting PDF to HTML conversion...');
  const inputFile = path.join(booksDir, bookPdf);
  const outputFile = path.join(outputDir, 'PrinciplesOfFinance.html');

  try {
    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Check if the input file exists
    await fs.access(inputFile);

    // Construct the command to run pdf2htmlEX
    // --embed-css 0 --embed-font 0 --embed-image 0 --embed-javascript 0 tells it to create separate files for assets
    // which makes the final HTML cleaner and easier to work with.
    const command = `pdf2htmlEX --dest-dir ${outputDir} ${inputFile}`;

    console.log(`Executing command: ${command}`);

    // Execute the command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`\n❌ Error during conversion: ${error.message}`);
        console.error('---');
        console.error('Please ensure that `pdf2htmlEX` is installed and accessible in your system PATH.');
        console.error('On macOS, you can install it with: `brew install pdf2htmlex`');
        console.error('---');
        return;
      }
      if (stderr) {
        console.warn(`Conversion warnings: ${stderr}`);
      }
      console.log(`\n✅ Success! HTML file generated at ${outputFile}`);
      console.log(stdout);
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ Error: Input file not found at ${inputFile}`);
    } else {
      console.error('\n❌ An unexpected error occurred:', error);
    }
  }
}

main();