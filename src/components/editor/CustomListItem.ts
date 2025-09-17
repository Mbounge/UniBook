import { ListItem } from '@tiptap/extension-list-item'

// This extends the default ListItem and adds the keyboard shortcuts we need.
export const CustomListItem = ListItem.extend({
  // By NOT providing a name, it correctly inherits and overrides "listItem"
  addKeyboardShortcuts() {
    return {
      // When the user presses Tab, we "sink" the list item (indent it)
      Tab: () => this.editor.commands.sinkListItem('listItem'),
      
      // When the user presses Shift+Tab, we "lift" the list item (outdent it)
      'Shift-Tab': () => this.editor.commands.liftListItem('listItem'),
    }
  },
})