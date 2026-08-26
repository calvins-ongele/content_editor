const editor = new ContentEditor({container: '#my-editor' }); 
// Set content
editor.set('<p>Welcome! Try out <code>inline code</code> or insert a callout block.</p>');

// get content
const content = editor.get(); 

//listen to changes
editor.on('key', function(e) {
    console.log('Key pressed:', e.event.key);
    console.log('Current HTML:', e.data); // equivalent to this.getData()
});

// Listen for content changes (typing, paste, undo/redo, modal inserts)
editor.on('change', function(e) {
    console.log('Content changed:', e.data);
});
