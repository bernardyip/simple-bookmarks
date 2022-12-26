import * as vscode from 'vscode';
import { Bookmark, Bookmarks } from "./bookmark";
import { BookmarksProvider } from "./bookmarks-tree-provider";

// A controller class to handle interactions with user from the extension API
export class BookmarksController {
  bookmarks: Bookmarks;
  bookmarksProvider: BookmarksProvider;
  treeView: vscode.TreeView<Bookmark>;
  
  constructor(context: vscode.ExtensionContext) {
    // Load up saved bookmarks
    this.bookmarks = new Bookmarks(context);
    this.bookmarks.load();

    //Initialize bookmarks provider for tree view
    this.bookmarksProvider = new BookmarksProvider(this.bookmarks);

    // Create treeview for side bar
    this.treeView = vscode.window.createTreeView('simple-bookmarks', { 
      treeDataProvider: this.bookmarksProvider, 
      dragAndDropController: this.bookmarksProvider
    });

    // Register events when a group is clicked to save the collapsible state
    this.treeView.onDidExpandElement(event => {
      event.element.isExpanded = true;
      this.bookmarks.save();
    })
    this.treeView.onDidCollapseElement(event => {
      event.element.isExpanded = false;
      this.bookmarks.save();
    })
    this.treeView
  }

  // This function adds a group to organize bookmarks
  public addGroup() {
    vscode.window.showInputBox({
      placeHolder: 'Enter a group label'
    }).then(newLabel => {
      // No labels was input by the user
      if (newLabel === undefined || newLabel.trim().length <= 0) {
        return;
      }
      // Check if label has already been used
      for (let bookmark of this.bookmarks.getBookmarksAndGroups()) {
        if (bookmark.label === newLabel) {
          vscode.window.showErrorMessage(`Label <${newLabel}> already exists. Use another label!`);
          return;
        }
      }
      this.bookmarks.add(new Bookmark(newLabel, undefined, undefined, undefined, undefined));
      vscode.window.showInformationMessage(`Group <${newLabel}> added`);
      this.bookmarks.save();
      this.bookmarksProvider.refresh();
    });
  }

  // This function adds a bookmark at the current cursor position
  public addBookmark() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    vscode.window.showInputBox({
      placeHolder: 'Enter a bookmark label'
    }).then(newLabel => {
      // No labels was input by the user
      if (newLabel === undefined || newLabel.trim().length <= 0) {
        return;
      }
      // Check if label has already been used
      for (let bookmark of this.bookmarks.getBookmarksAndGroups()) {
        if (bookmark.label === newLabel) {
          vscode.window.showErrorMessage(`Bookmark <${newLabel}> already exists. Use another label!`);
          return;
        }
      }
      const filePath = editor.document.fileName;
      const lineNumber = editor.selection.active.line;
      const text = editor.document.lineAt(lineNumber).text;
      this.bookmarks.add(new Bookmark(newLabel, filePath, lineNumber, text, undefined));
      vscode.window.showInformationMessage(`Bookmark <${newLabel}> added`);
      this.bookmarks.save();
      this.bookmarksProvider.refresh();
    });
  }

  // To display the bookmark in vscode's editor
  private goToBookmark(bookmark: Bookmark) {
    if (bookmark.isGroup()) {
      return;
    }
    let path = vscode.Uri.file(bookmark.filePath!);
    if (bookmark.filePath!.startsWith("Untitled")) {
      path = vscode.Uri.parse("untitled:" + bookmark.filePath);
    }
    vscode.window.showTextDocument(path, { preview: false, preserveFocus: false }).then(
      textEditor => {
        try {
          let range = new vscode.Range(bookmark!.lineNumber, 0, bookmark.lineNumber, 0);
          textEditor.selection = new vscode.Selection(range.start, range.start);
          textEditor.revealRange(range);
        } catch (e) {
          vscode.window.showWarningMessage("Error: Failed to navigate to bookmark: " + e);
          return;
        }
      },
      rejectReason => {
        vscode.window.showWarningMessage("Error: Failed to navigate to bookmark: " + rejectReason.message);
      }
    );
  }

  // Prompts user based on the list of bookmarks and jumps to it
  private promptAndJumpToBookmark() {
    const input = vscode.window.createQuickPick<vscode.QuickPickItem>();
    input.title = "Select a bookmark to jump to";
    input.placeholder = "Type a bookmark label to filter";

    vscode.window.showQuickPick(this.bookmarks.getBookmarkLists()).then((value) => {
      // Look for the index of the selection
      let selectedBookmark:Bookmark | undefined = undefined;
      for (let cur_bm of this.bookmarks.getBookmarks()) {
        if (cur_bm.toString() === value) {
          selectedBookmark = cur_bm;
          break;
        }
      }

      if (selectedBookmark !== undefined) {
        this.goToBookmark(selectedBookmark);
      }
    });
  }

  // This function jumps to the specified bookmark
  public jumpToBookmark(bookmark: Bookmark) {
    if (bookmark === undefined || !this.bookmarks.isInBookmarkList(bookmark)) {
      // bookmark undefined indicates its run from the command palatte
      // bookmark not in bookmarks indicates its run from the context menu
      this.promptAndJumpToBookmark();
      return;
    }

    // This command is run from the tree view, jump to bookmark
    this.goToBookmark(bookmark);
  }

  // Remove a bookmark from the list
  public removeBookmark(bookmark: Bookmark) {
    if (bookmark === undefined) {
      this.bookmarks.clear();
    } else {
      // If bookmark is a group, we delete all bookmarks under it
      if (bookmark.isGroup()) {
        this.bookmarks.getBookmarks().forEach(cur_bm => {
          if (cur_bm.group === bookmark.label) {
            this.bookmarks.remove(cur_bm);
          }
        })
      }
      this.bookmarks.remove(bookmark);
    }

    this.bookmarks.save();
    this.bookmarksProvider.refresh();
  }

  // Modify the label of a bookmark
  // No action is taken if the new label specified has been used before
  public editBookmarkLabel(bookmark: Bookmark) {
    if (bookmark === undefined) {
      return;
    }
    vscode.window.showInputBox({
      placeHolder: 'Enter a new bookmark label'
    }).then(newLabel => {
      // No labels was input by the user
      if (newLabel === undefined || newLabel.trim().length <= 0) {
        return;
      }
      // Check if label has already been used
      for (let cur_bm of this.bookmarks.getBookmarksAndGroups()) {
        if (cur_bm.label === newLabel) {
          vscode.window.showErrorMessage(`Bookmark <${newLabel}> already exists. Use another label!`);
          return;
        }
      }

      // If bookmark is a group, we need to update bookmarks under that group
      if (bookmark.isGroup()) {
        this.bookmarks.getBookmarks().forEach(cur_bm => {
          if (cur_bm.group === bookmark.label) {
            cur_bm.group = newLabel;
          }
        })
      }

      bookmark.label = newLabel;
      this.bookmarks.save();
      this.bookmarksProvider.refresh();
    });
  }

  // This function updates the bookmarks when the contents of a text document are changed
  public updateBookmarksOnChangeText(event: vscode.TextDocumentChangeEvent) {
    const filePath = event.document.fileName;
    const changes = event.contentChanges;
    // Loop through each bookmark
    this.bookmarks.getBookmarks().forEach(bookmark => {
      if (bookmark.filePath !== filePath || bookmark.isGroup()) {
        // Different file or bookmark is a group, skip
        return;
      }

      // Loop through each change
      for (const change of changes) {
        let newLineCount = change.text.split("\n").length - 1;
        let oldFirstLine = change.range.start.line;
        let oldLastLine = change.range.end.line;
        let oldLineCount = oldLastLine - oldFirstLine;

        // Just update the text if we paste over the bookmark with the same number of lines
        if (newLineCount === oldLineCount && bookmark.lineNumber >= oldFirstLine && bookmark.lineNumber <= oldLastLine) {
          bookmark.text = event.document.lineAt(bookmark.lineNumber).text.trim();
          continue;
        }

        // We add more than we remove
        if (newLineCount > oldLineCount) {
          let shiftDownBy = newLineCount - oldLineCount;
          let newLastLine = oldFirstLine + newLineCount;

          // Indicates that there is no text before what we paste/added
          // This will be used to skip the bookmark if we paste after the first non-whitespace character of the bookmark text
          let firstLinePrefix = event.document.getText(
            new vscode.Range(oldFirstLine, 0, oldFirstLine, change.range.start.character)
          );
          let isFirstLinePrefixEmpty = firstLinePrefix.trim() === "";
          
          // Indicates how many lines were shifted down from the start of the change
          let shiftDownFromLine = (isFirstLinePrefixEmpty ? oldFirstLine : oldFirstLine + 1);

          // Check if the bookmark is below the lines that are shifted down
          if (bookmark.lineNumber >= shiftDownFromLine) {
            // Add by the number of lines
            bookmark.lineNumber += shiftDownBy;
          }

          // Update the text in the bookmark if it is within the change range
          if (bookmark.lineNumber >= oldFirstLine && bookmark.lineNumber <= newLastLine) {
            bookmark.text = event.document.lineAt(bookmark.lineNumber).text.trim();
          }
          continue;
        }

        // We remove more than we add
        if (newLineCount < oldLineCount) {
          let shiftUpBy = oldLineCount - newLineCount;
          let newLastLine = oldFirstLine + newLineCount;

          // Indicates that there is no text before what we paste/added
          // This will be used to skip the bookmark if we paste after the first non-whitespace character of the bookmark text
          let firstLinePrefix = event.document.getText(
              new vscode.Range(oldFirstLine, 0, oldFirstLine, change.range.start.character)
          );
          let isFirstLineBookmarkDeletable = firstLinePrefix.trim() === "";

          if (!isFirstLineBookmarkDeletable) {
            let firstLineBookmark = this.bookmarks.getBookmarks().find(bookmark => bookmark.lineNumber === oldFirstLine);
            if (typeof firstLineBookmark === "undefined") {
              isFirstLineBookmarkDeletable = true;
            }
          }

          let deleteFromLine = (isFirstLineBookmarkDeletable ? oldFirstLine : oldFirstLine + 1);
          let shiftFromLine = deleteFromLine + shiftUpBy;

          if (bookmark.lineNumber < oldFirstLine) {
            continue;
          }

          if (bookmark.lineNumber >= deleteFromLine && bookmark.lineNumber < shiftFromLine) {
            this.bookmarks.remove(bookmark);
            continue;
          }

          if (bookmark.lineNumber >= shiftFromLine) {
            bookmark.lineNumber -= shiftUpBy;
          }

          if (bookmark.lineNumber >= oldFirstLine && bookmark.lineNumber <= newLastLine) {
            bookmark.text = event.document.lineAt(bookmark.lineNumber).text.trim();
          }
          continue;
        }
      }
    });
    this.bookmarks.save();
    this.bookmarksProvider.refresh();
  }

  // Handle event updates when a file is renamed
  public updateBookmarksOnFileRename(fileRenameEvent: vscode.FileRenameEvent) {
    let changedFiles = new Map<string, boolean>();

    for (let rename of fileRenameEvent.files) {
      vscode.workspace.fs.stat(rename.newUri).then((stat) => {
        let oldFsPath = rename.oldUri.fsPath;
        let newFsPath = rename.newUri.fsPath;
        
        for (let bookmark of this.bookmarks.getBookmarks()) {
          if ((stat.type & vscode.FileType.Directory) > 0 && bookmark.filePath!.startsWith(oldFsPath)) {
            // Handle bookmarks that are affected by directory renames
            bookmark.filePath = newFsPath + bookmark.filePath!.substring(oldFsPath.length);
          } else if (bookmark.filePath === oldFsPath) {
            // Handle file renames
            bookmark.filePath = newFsPath;
          }
        }
      });
    }
    this.bookmarks.save();
    this.bookmarksProvider.refresh();
  }

  // Handle event updates when a file is deleted
  public updateBookmarksOnFileDeleted(fileDeleteEvent: vscode.FileDeleteEvent) {
    // Loop through list of files deleted in event
    for (let uri of fileDeleteEvent.files) {
      let deletedFsPath = uri.fsPath;
      let bookmarksDeleted = false;

      // Delete bookmark if the file is deleted
      for (let bookmark of this.bookmarks.getBookmarks()) {
        // Could be the actual bookmark itself, or a directory was deleted
        if (bookmark.filePath!.startsWith(deletedFsPath)) {
          this.bookmarks.remove(bookmark);
          bookmarksDeleted = true;
        }
      }

      // If there were bookmarks deleted, save and update views
      if (bookmarksDeleted) {
        this.bookmarks.save();
        this.bookmarksProvider.refresh();
      }
    }
  }
}