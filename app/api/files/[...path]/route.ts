import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolvePathParam(params: unknown): Promise<string[]> {
  const p: any = typeof (params as any)?.then === 'function' ? await (params as any) : params;
  const raw = p?.path;
  return Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
}

// GET /api/files/[...path] - Read file content from workspace directories
export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const parts = await resolvePathParam(params);
    const filePath = parts.join('/');
    
    // Security: Only allow .md files
    if (!filePath.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Only .md files are allowed' },
        { status: 403 }
      );
    }

    // Security: Prevent path traversal attacks
    if (filePath.includes('..')) {
      return NextResponse.json(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }

    // Look for the file in ~/.openclaw/workspace-* directories
    const homeDir = os.homedir();
    const openclawDir = path.join(homeDir, '.openclaw');
    
    let fullPath: string | null = null;
    
    try {
      // Check if the file path is absolute or relative
      if (filePath.startsWith('/')) {
        // Absolute path - verify it's within an openclaw workspace
        if (filePath.includes('.openclaw/workspace-')) {
          fullPath = filePath;
        }
      } else {
        // Relative path - search in workspace directories
        const entries = await fs.readdir(openclawDir, { withFileTypes: true });
        const workspaceDirs = entries
          .filter(entry => entry.isDirectory() && entry.name.startsWith('workspace-'))
          .map(entry => entry.name);

        for (const workspace of workspaceDirs) {
          const candidatePath = path.join(openclawDir, workspace, filePath);
          try {
            await fs.access(candidatePath);
            fullPath = candidatePath;
            break;
          } catch {
            // File not found in this workspace, continue
          }
        }
      }
    } catch (error) {
      // openclaw directory doesn't exist
      return NextResponse.json(
        { success: false, error: 'Workspace directory not found' },
        { status: 404 }
      );
    }

    if (!fullPath) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Verify the resolved path is within allowed directories
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.includes('.openclaw/workspace-')) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Read the file content
    const content = await fs.readFile(resolvedPath, 'utf-8');

    return NextResponse.json({
      success: true,
      content,
      path: resolvedPath,
    });
  } catch (error) {
    console.error('Error reading file:', error);
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
