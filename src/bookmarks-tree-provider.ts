import * as vscode from 'vscode';
import { Bookmark, Bookmarks } from './bookmark';

// A provider class to link with the TreeView element of the vscode extension API
export class BookmarksProvider implements vscode.TreeDataProvider<Bookmark>, vscode.TreeDragAndDropController<Bookmark> {
  dropMimeTypes = ['application/vnd.code.tree.simple-bookmarks'];
	dragMimeTypes = ['application/vnd.code.tree.simple-bookmarks'];
  private _onDidChangeTreeData: vscode.EventEmitter<Bookmark | undefined | null | void> = new vscode.EventEmitter<Bookmark | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Bookmark | undefined | null | void> = this._onDidChangeTreeData.event;

  private bookmarks: Bookmarks;

  constructor(bookmarks: Bookmarks) {
    this.bookmarks = bookmarks;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Bookmark): vscode.TreeItem {
    return this.toTreeItem(element);
  }

  getChildren(element?: Bookmark): Bookmark[] {
    if (element === undefined) {
      return this.bookmarks.bookmarks;
    }

    return [];
  }

  // To convert to a treeview item
  toTreeItem(bookmark: Bookmark): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(bookmark.toString());
    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
    treeItem.tooltip = vscode.workspace.asRelativePath(bookmark.filePath);
    treeItem.iconPath = new vscode.ThemeIcon('bookmark'),
    treeItem.command = {
      command: 'simple-bookmarks.jumpToBookmark',
      title: 'Jump to bookmark',
      arguments: [bookmark]
    };
    return treeItem;
  }

  // Handle drop event of drag&drop
  public async handleDrop(target: Bookmark | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    const transferItem = sources.get('application/vnd.code.tree.simple-bookmarks');
    const source = transferItem?.value[0];

    if (target === undefined || source === undefined) {
      return;
    }

    this.bookmarks.moveBookmarkBefore(source, target);
    this.bookmarks.save();
    this.refresh();
	}

  // Handle drag event of drag&drop
  public async handleDrag(source: Bookmark[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		treeDataTransfer.set('application/vnd.code.tree.simple-bookmarks', new vscode.DataTransferItem(source));
	}
}