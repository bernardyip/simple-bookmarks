import * as vscode from 'vscode';
import { basename } from 'path';

// Bookmark class to store information about bookmarks
// Can optionally be a group of bookmarks too
export class Bookmark {
  label: string;
  filePath?: string;
  lineNumber: number;
  text?: string;
  group?: string;
  isExpanded: boolean;

  constructor(label: string, filePath?: string, lineNumber?: number, text?: string, group?: string, isExpanded?: boolean) {
    this.label = label;
    this.filePath = filePath;
    this.lineNumber = lineNumber? lineNumber : -1;
    this.text = text;
    this.group = group;
    this.isExpanded = isExpanded? isExpanded : false;
  }

  // A group will not have a filePath, lineNumber or text
  public isGroup(): boolean {
    return this.filePath === undefined || this.lineNumber === undefined || this.text === undefined;
  }

  public toString() : string {
    if (this.isGroup()) {
      return this.label;
    } else {
      const fileName = basename(this.filePath!);
      return `${this.label} | ${fileName}:${this.lineNumber! + 1}`;
    }
  }

  public static fromSavedData(data: any) {
    return new Bookmark(data.label, data.filePath, data.lineNumber, data.text, data.group, data.isExpanded);
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

  public getBookmarkByLabel(label: string | undefined) {
    if (label === undefined) {
      return null;
    }
    // Labels are unique, so there should only be 1 bookmark
    return this.bookmarks.filter((value) => value.label === label)[0];
  }

  public remove(bookmark: Bookmark) {
    const itemIdx = this.bookmarks.indexOf(bookmark);
    if (itemIdx !== -1) {
      this.bookmarks.splice(itemIdx, 1);
    }
  }

  public add(bookmark: Bookmark) {
    if (bookmark !== undefined) {
      this.bookmarks.push(bookmark);
    }
  }

  public getBookmarksAndGroups() {
    return this.bookmarks;
  }

  // Get bookmarks only (excluding groups)
  public getBookmarks() {
    return this.bookmarks.filter(cur_bm => {
      return !cur_bm.isGroup()
    })
  }

  public moveBookmarksToBack(source_list: Bookmark[]) {
    for (let bookmark of source_list) {
      this.moveBookmarkToBack(bookmark);
    }
  }

  public moveBookmarkToBack(source: Bookmark) {
    // Only worth considering if length is 2, so an order is needed
    if (source === undefined || this.bookmarks.length <= 1) {
      return;
    }
    this.moveBookmarkBefore(source, this.bookmarks[this.bookmarks.length - 1]);
  }

  public moveBookmarksBefore(source_list: Bookmark[], target: Bookmark) {
    // We reverse because we want to maintain the order if possible
    for (let cur_bm of source_list.reverse()) {
      this.moveBookmarkBefore(cur_bm, target);
    }
  }

  public moveBookmarkBefore(source: Bookmark, target: Bookmark) {
    if (source === undefined || target === undefined) {
      return;
    }
    // Get the indexes of the source and target
    const targetIdx = this.bookmarks.indexOf(target);
    const sourceIdx = this.bookmarks.indexOf(source);

    // Ignore if any element not found or the target and source is the same element
    if (targetIdx === -1 || sourceIdx === -1 || targetIdx === sourceIdx) {
      return;
    }

    // Removes the source element
    this.bookmarks.splice(sourceIdx, 1)[0];
    // Add back source element before target element
    if (targetIdx < sourceIdx) {
      this.bookmarks.splice(targetIdx + 1, 0, source);
    } else {
      // We do not need to add 1 if position of target does not change when source is removed
      this.bookmarks.splice(targetIdx, 0, source);
    }
  }

  public isInBookmarkList(bookmark: Bookmark) {
    const result = this.bookmarks.filter(bm => bm.label === bookmark.label);
    return result.length > 0;
  }

  // Get a string array of the bookmarks stored
  public getBookmarkLists(): string[] {
    let stringList = [];
    for (let bookmark of this.getBookmarks()) {
      stringList.push(bookmark.toString());
    }
    return stringList;
  }

  public isLabelUsed(label: string): boolean {
    // Check if label has already been used
    for (let bookmark of this.getBookmarksAndGroups()) {
      if (bookmark.label === label) {
        return true;
      }
    }
    return false;
  }

  public getParentList(bookmark: Bookmark): Bookmark[] {
    let parent_list: Bookmark[] = [];
    let cur_bm: Bookmark = bookmark;
    while (cur_bm !== undefined) {
      let parent: Bookmark | null = this.getBookmarkByLabel(cur_bm.group);
      // Second condition might indicate an infinite loop
      if (parent !== null && !parent_list.includes(parent)) {
        parent_list.push(parent);
        cur_bm = parent;
      } else {
        break;
      }
    }
    return parent_list;
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