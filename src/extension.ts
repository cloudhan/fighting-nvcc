import * as vscode from 'vscode';
import * as path from 'path';

type TerminalLinkWithData = vscode.TerminalLink & { data: any };

function rsplit(str: string, sep: string, maxsplit: number) {
    var segments = str.split(sep);
    return maxsplit ? [ segments.slice(0, -maxsplit).join(sep) ].concat(segments.slice(-maxsplit)) : segments;
}

export async function activate(context: vscode.ExtensionContext) {
  // console.log('"fighting-nvcc" is now active!');

  // Register the terminal link provider
  const terminalLinkProvider = vscode.window.registerTerminalLinkProvider({
    provideTerminalLinks: (context, token) => {
      const line = context.line as string;

      if (!line.startsWith('                instantiation of "')) {
        return [];
      }

      // Also look for file paths
      const segments = rsplit(line, " at line ", 1);
      if (segments.length == 1) {
        return [];
      }

      const startIndex = segments[0].length + 1;
      const length = "at line ".length + segments[1].length;

      const lineNumberFilePath = segments[1].split(" of ");

      const lineNumber = parseInt(lineNumberFilePath[0]);
      const filePath = lineNumberFilePath[1];

      return [
        {
          startIndex,
          length,
          tooltip: 'Open template instantiation details',
          data: {
            templateInfo: "find link: " + filePath + ":" + lineNumber,
            filePath: filePath,
            lineNumber: lineNumber
          }
        } as TerminalLinkWithData
      ];
    },

    handleTerminalLink: async (link) => {
      try {
        // Get the file path and line number from the link data
        const filePath = (link as TerminalLinkWithData).data.filePath;
        const lineNumber = (link as TerminalLinkWithData).data.lineNumber;

        // Try to find the file in the workspace
        let fullPath = filePath;

        // If the path is not absolute, try to resolve it relative to the workspace
        if (!path.isAbsolute(filePath)) {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            fullPath = path.join(workspaceFolders[0].uri.fsPath, filePath);
          }
        }

        // Create a URI for the file
        const fileUri = vscode.Uri.file(fullPath);

        // console.log(`Opening file: ${filePath} at line ${lineNumber}`);

        // Open the document and show it in the editor
        const document = await vscode.workspace.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(document);

        // Position the cursor at the specified line
        const position = new vscode.Position(lineNumber - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );

        // vscode.window.showInformationMessage(`Opened ${filePath} at line ${lineNumber}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
      }
    }
  });

  context.subscriptions.push(terminalLinkProvider);
}

export function deactivate() { }
