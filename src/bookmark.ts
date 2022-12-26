import * as vscode from 'vscode';
import { basename } from 'path';

// Bookmark class to store information about bookmarks
export class Bookmark {
  label?: string;
  filePath: string;
  lineNumber: number;
  text: string;

  constructor(label: string | undefined, filePath: string, lineNumber: number, text: string) {
    if (label === undefined) {
      this.label = filePath;
    } else {
      this.label = label;
    }
    this.filePath = filePath;
    this.lineNumber = lineNumber;
    this.text = text;
  }

  public static fromSavedData(data: any) {
    return new Bookmark(data.label, data.filePath, data.lineNumber, data.text);
  }

  public toString() : string {
    const fileName = basename(this.filePath);
    return `${this.label} | ${fileName}:${this.lineNumber + 1}`;
  }
}

// Container with helper functions to store a list of bookmarks
export class Bookmarks {
  private static savedBookmarksKey = "simple-bookmarks.bookmarks";

  bookmarks: Array<Bookmark>;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.bookmarks = new Array();
    this.context = context;
  }

  public remove(bookmark: Bookmark) {
    const itemIdx = this.bookmarks.indexOf(bookmark);
    this.bookmarks.splice(itemIdx, 1);
  }

  public moveBookmarkBefore(source: Bookmark, target: Bookmark) {
    if (source === undefined || target === undefined) {
      return;
    }
    // Get the indexes of the source and target
    const targetIdx = this.bookmarks.indexOf(target);
    const sourceIdx = this.bookmarks.indexOf(source);

    if (targetIdx === -1 || sourceIdx === -1) {
      return;
    }

    // Removes the source element
    this.bookmarks.splice(sourceIdx, 1)[0];
    // Add back source element before target element
    this.bookmarks.splice(targetIdx + 1, 0, source);
  }

  public isInBookmarkList(bookmark: Bookmark) {
    const result = this.bookmarks.filter(bm => bm.label === bookmark.label);
    return result.length > 0;
  }

  // Get a string array of the bookmarks stored
  public getBookmarkLists(): string[] {
    let stringList = [];
    for (let bookmark of this.bookmarks) {
      stringList.push(bookmark.toString());
    }
    return stringList;
  }

  public clear() {
    // Setting length to 0 clears the array
    this.bookmarks.length = 0;
  }

  public save() {
    this.context.workspaceState.update(Bookmarks.savedBookmarksKey, this.bookmarks);
  }

  public load() {
    let loadedBookmarks: any = this.context.workspaceState.get(Bookmarks.savedBookmarksKey)
    if (loadedBookmarks === undefined || loadedBookmarks === null) {
      return;
    }
    for (let loadedBookmark of loadedBookmarks) {
      this.bookmarks.push(Bookmark.fromSavedData(loadedBookmark));
    }
  }
}