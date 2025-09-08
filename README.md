# ReportForge

A modern, block-based report editor built with React, TypeScript, and BlockNote for creating professional mining and geological reports..

## Features

### Document Navigation (Wayfinder)

The report editor includes a floating wayfinder menu that provides quick navigation to different sections of your document:

- **Floating Menu**: The menu follows you as you scroll through the document, staying visible when you're in the editor area
- **Smart Positioning**: Automatically aligns with the top of the editor and stays within the viewport
- **Outline View**: Click the menu icon in the floating toolbar to see a hierarchical outline of all headings in your document
- **Quick Navigation**: Click any section in the outline to instantly scroll to that part of the document
- **Smart Numbering**: Sections are automatically numbered (excluding special sections like "QP Certification", "Table of Contents", and "Disclaimer")
- **Keyboard Support**: Press `Escape` to close the wayfinder popup
- **Click Outside**: Click anywhere outside the popup to close it
- **Responsive Design**: Adapts to different screen sizes and hides on very small screens to prevent overlap

The wayfinder automatically updates as you add, remove, or modify headings in your document, providing a real-time overview of your document structure.

### Report Templates

- **NI 43-101 Reports**: Technical reports for mineral resources (Inferred, Indicated, Measured)
- **JORC Reports**: Mineral resource reports following JORC guidelines
- **Custom Templates**: Create your own report structures

### Rich Text Editing

- Block-based editing with drag & drop
- Real-time collaboration support
- Markdown and HTML export
- Professional formatting tools

## Development

To start the development server:

```bash
npm run dev
```

## Technologies Used

- React 18
- TypeScript
- BlockNote (Rich Text Editor)
- Carbon Design System
- Vite
- Supabase

## Project Structure

```
src/
├── components/
│   ├── layout/
│   ├── report/
│   │   ├── FloatingEditorMenu.tsx  # Contains the wayfinder functionality
│   │   └── ...
│   └── ui/
├── pages/
│   ├── report/
│   │   ├── ReportEditor.tsx        # Main report editing interface
│   │   └── ...
│   └── ...
├── styles/
└── ...
```

## Setup

**Quick Start:**
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Start development server: `npm run dev`

**📋 For detailed setup with AI features, see [SETUP.md](SETUP.md)**

**Required API Keys:**
- OpenAI (for AI features) - Get from [platform.openai.com](https://platform.openai.com)
- Supabase (for app functionality) - Get from [supabase.com](https://supabase.com)  
- Liveblocks (for collaboration) - Get from [liveblocks.io](https://liveblocks.io)
- Pinecone (optional, for enhanced RAG) - Get from [pinecone.io](https://pinecone.io)

## Contributing

Please follow the project standards defined in `.cursor/rules/reportforge-standards.mdc` for TypeScript, React, and Carbon Design System best practices.
