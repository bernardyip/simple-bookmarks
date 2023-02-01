import * as vscode from 'vscode';
import { BookmarksController } from './bookmarks-controller';

let bookmarksController: BookmarksController;

export function activate(context: vscode.ExtensionContext) {
  // Initialize controller to handle interaction with user
  bookmarksController = new BookmarksController(context);

  // Track events to keep track of bookmarks
  vscode.workspace.onDidChangeTextDocument(
    (textDocumentChangeEvent) => bookmarksController.updateBookmarksOnChangeText(textDocumentChangeEvent)
  );
	vscode.workspace.onDidRenameFiles(
    (fileRenameEvent) => bookmarksController.updateBookmarksOnFileRename(fileRenameEvent)
  );
	vscode.workspace.onDidDeleteFiles(
    (fileDeleteEvent) => bookmarksController.updateBookmarksOnFileDeleted(fileDeleteEvent)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('simple-bookmarks.addBookmark', () => bookmarksController.addBookmark()),
    vscode.commands.registerCommand('simple-bookmarks.jumpToBookmark', bm => bookmarksController.jumpToBookmark(bm)), 
    vscode.commands.registerCommand('simple-bookmarks.clearAllBookmarks', bm => bookmarksController.removeBookmark(bm)), 
    vscode.commands.registerCommand('simple-bookmarks.deleteBookmark', bm => bookmarksController.removeBookmark(bm)), 
    vscode.commands.registerCommand('simple-bookmarks.editBookmarkLabel', bm => bookmarksController.editBookmarkLabel(bm)), 
    vscode.commands.registerCommand('simple-bookmarks.addGroup', () => bookmarksController.addGroup()),
  );

  // Register the bookmarks tree view so the icon appears
  context.subscriptions.push(bookmarksController.treeView);
}

// this method is called when your extension is deactivated
export function deactivate() {

}
