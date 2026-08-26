class ContentEditor {
    constructor(options = {}) {
        this.container = typeof options.container === 'string' 
            ? document.querySelector(options.container) 
            : options.container;

        if (!this.container) {
            console.error('ContentEditor: Target container not found.');
            return;
        }

        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.isSourceView = false;
        this.isMaximized = false;
        this.savedSelectionRange = null;

        this.init();
    }

    init() {
        this.injectStyles();
        this.buildUI();
        this.attachEvents();
        this.updateStats();
        this.saveState();
    }

    injectStyles() {
        if (document.getElementById('content-editor-styles')) return;

        const css = `
            .ce-wrapper {
                border: 1px solid #ced4da;
                border-radius: 8px;
                background: #fff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                display: flex;
                flex-direction: column;
                transition: all 0.2s ease;
            }
            .ce-wrapper.ce-maximized {
                position: fixed;
                top: 10px;
                left: 10px;
                right: 10px;
                bottom: 10px;
                z-index: 9999;
                height: calc(100vh - 20px) !important;
            }
            .ce-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 8px;
                background: #f8f9fa;
                border-bottom: 1px solid #ced4da;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .ce-btn-group {
                display: flex;
                gap: 2px;
                border-right: 1px solid #dee2e6;
                padding-right: 6px;
                margin-right: 2px;
            }
            .ce-btn {
                background: #fff;
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 13px;
                cursor: pointer;
                color: #333;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                transition: background 0.15s ease, border-color 0.15s ease;
            }
            .ce-btn:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }
            .ce-btn:active {
                background: #dee2e6;
            }
            .ce-select {
                background: #fff;
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 13px;
                color: #333;
                outline: none;
                cursor: pointer;
            }
            .ce-body {
                position: relative;
                flex-grow: 1;
                min-height: 250px;
            }
            .ce-content, .ce-source {
                width: 100%;
                height: 100%;
                min-height: 250px;
                padding: 12px;
                box-sizing: border-box;
                outline: none;
                overflow-y: auto;
            }

            /* Footer & Stats Bar */
            .ce-footer {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 16px;
                padding: 6px 12px;
                background: #f8f9fa;
                border-top: 1px solid #ced4da;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
                font-size: 12px;
                color: #6c757d;
                user-select: none;
            }
            .ce-stat-item {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .ce-stat-val {
                font-weight: 600;
                color: #495057;
            }

            /* Content Elements Styling */
            .ce-content table {
                border-collapse: collapse;
                width: 100%;
                margin: 10px 0;
            }
            .ce-content th, .ce-content td {
                border: 1px solid #adb5bd;
                padding: 8px;
                min-width: 25px;
            }
            .ce-content blockquote {
                border-left: 4px solid #0d6efd;
                background: #f1f3f5;
                margin: 10px 0;
                padding: 10px 15px;
                font-style: italic;
            }
            .ce-content img {
                max-width: 100%;
                height: auto;
            }
            
            /* Inline Code & Container Callout */
            .ce-content code.ce-inline-code {
                background-color: #e9ecef;
                color: #d63384;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.875em;
            }
            .ce-content pre.ce-code-block {
                background-color: #212529;
                color: #f8f9fa;
                padding: 12px 16px;
                border-radius: 6px;
                font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 13px;
                overflow-x: auto;
                margin: 12px 0;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .ce-content pre.ce-code-block code {
                background: transparent;
                color: inherit;
                padding: 0;
            }
            .ce-content .ce-callout {
                padding: 12px 16px;
                margin: 12px 0;
                border-left: 4px solid #0d6efd;
                background-color: #e7f1ff;
                border-radius: 0 6px 6px 0;
                color: #084298;
            }

            .ce-source {
                display: none;
                font-family: monospace;
                font-size: 13px;
                background: #212529;
                color: #f8f9fa;
                border: none;
                resize: none;
            }

            /* Custom Modal Styles */
            .ce-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            .ce-modal-overlay.ce-active {
                opacity: 1;
                pointer-events: auto;
            }
            .ce-modal {
                background: #fff;
                width: 420px;
                max-width: 90%;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                overflow: hidden;
                transform: translateY(-20px);
                transition: transform 0.2s ease;
            }
            .ce-modal-overlay.ce-active .ce-modal {
                transform: translateY(0);
            }
            .ce-modal-header {
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
            }
            .ce-modal-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #6c757d;
            }
            .ce-modal-body {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .ce-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .ce-field label {
                font-size: 12px;
                font-weight: 600;
                color: #495057;
            }
            .ce-field input, .ce-field select, .ce-field textarea {
                padding: 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
            }
            .ce-field-row {
                display: flex;
                gap: 8px;
            }
            .ce-field-row .ce-field {
                flex: 1;
            }
            .ce-modal-footer {
                padding: 12px 16px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }
        `;

        const style = document.createElement('style');
        style.id = 'content-editor-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    buildUI() {
        this.container.innerHTML = `
            <div class="ce-wrapper" id="ce-wrapper">
                <div class="ce-toolbar">
                    <div class="ce-btn-group">
                        <button type="button" class="ce-btn" data-cmd="bold" title="Bold"><b>B</b></button>
                        <button type="button" class="ce-btn" data-cmd="italic" title="Italic"><i>I</i></button>
                        <button type="button" class="ce-btn" data-cmd="underline" title="Underline"><u>U</u></button>
                        <button type="button" class="ce-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                    </div>

                    <div class="ce-btn-group">
                        <select class="ce-select" id="ce-heading-select">
                            <option value="p">Paragraph</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                        </select>
                    </div>

                    <div class="ce-btn-group">
                        <button type="button" class="ce-btn" id="ce-btn-code-inline" title="Inline Code"><code>&lt;/&gt;</code></button>
                        <button type="button" class="ce-btn" id="ce-btn-code-block" title="Code Block">Code Block</button>
                        <button type="button" class="ce-btn" id="ce-btn-callout" title="Container / Callout">Callout</button>
                    </div>

                    <div class="ce-btn-group">
                        <button type="button" class="ce-btn" data-cmd="insertOrderedList" title="Numbered List">1.</button>
                        <button type="button" class="ce-btn" data-cmd="insertUnorderedList" title="Bullet List">•</button>
                        <button type="button" class="ce-btn" data-cmd="indent" title="Indent">Tab →</button>
                        <button type="button" class="ce-btn" data-cmd="outdent" title="Decrease Indent">← Tab</button>
                    </div>

                    <div class="ce-btn-group">
                        <button type="button"  class="ce-btn" id="ce-btn-link" title="Add Link">Link</button>
                        <button type="button" class="ce-btn" data-cmd="unlink" title="Remove Link">Unlink</button>
                        <button type="button" class="ce-btn" id="ce-btn-image" title="Add Image">Image</button>
                        <button type="button" class="ce-btn" id="ce-btn-video" title="Add Video">Video</button>
                    </div>

                    <div class="ce-btn-group">
                        <button type="button" class="ce-btn" id="ce-btn-table-add" title="Insert Table">Table</button>
                        <button type="button" class="ce-btn" id="ce-btn-row-add" title="Insert Row">+ Row</button>
                        <button type="button" class="ce-btn" id="ce-btn-row-del" title="Delete Row">- Row</button>
                        <button type="button" class="ce-btn" id="ce-btn-col-add" title="Insert Column">+ Col</button>
                        <button type="button" class="ce-btn" id="ce-btn-col-del" title="Delete Column">- Col</button>
                        <button type="button" class="ce-btn" id="ce-btn-table-del" title="Delete Table">Del Table</button>
                    </div>

                    <div class="ce-btn-group">
                        <button type="button" class="ce-btn" data-cmd="formatBlock" data-val="blockquote" title="Blockquote">""</button>
                        <button type="button" class="ce-btn" id="ce-btn-source" title="Toggle Source View">Source</button>
                        <button type="button" class="ce-btn" id="ce-btn-max" title="Maximize">⛶</button>
                    </div>

                    <div class="ce-btn-group" style="border-right: none;">
                        <button type="button" class="ce-btn" id="ce-btn-undo" title="Undo">↶</button>
                        <button type="button" class="ce-btn" id="ce-btn-redo" title="Redo">↷</button>
                    </div>
                </div>
                <div class="ce-body">
                    <div class="ce-content" contenteditable="true"></div>
                    <textarea class="ce-source"></textarea>
                </div>
                <div class="ce-footer">
                    <span class="ce-stat-item">Words: <span class="ce-stat-val" id="ce-stat-words">0</span></span>
                    <span class="ce-stat-item">Chars: <span class="ce-stat-val" id="ce-stat-chars">0</span></span>
                    <span class="ce-stat-item">(no spaces: <span class="ce-stat-val" id="ce-stat-chars-nospace">0</span>)</span>
                    <span class="ce-stat-item">Read time: <span class="ce-stat-val" id="ce-stat-readtime">0 min</span></span>
                </div>
            </div>

            <!-- Custom Modal -->
            <div class="ce-modal-overlay" id="ce-modal-overlay">
                <div class="ce-modal">
                    <div class="ce-modal-header">
                        <span id="ce-modal-title">Dialog</span>
                        <button type="button" class="ce-modal-close" id="ce-modal-close-btn">&times;</button>
                    </div>
                    <div class="ce-modal-body" id="ce-modal-body"></div>
                    <div class="ce-modal-footer">
                        <button type="button" class="ce-btn" id="ce-modal-cancel">Cancel</button>
                        <button type="button" class="ce-btn" id="ce-modal-submit" style="background:#0d6efd; color:#fff; border:none;">Insert</button>
                    </div>
                </div>
            </div>
        `;

        this.editor = this.container.querySelector('.ce-content');
        this.sourceArea = this.container.querySelector('.ce-source');
        this.wrapper = this.container.querySelector('#ce-wrapper');
        this.modalOverlay = this.container.querySelector('#ce-modal-overlay');

        // Stats Elements
        this.statWords = this.container.querySelector('#ce-stat-words');
        this.statChars = this.container.querySelector('#ce-stat-chars');
        this.statCharsNoSpace = this.container.querySelector('#ce-stat-chars-nospace');
        this.statReadTime = this.container.querySelector('#ce-stat-readtime');
    }

    attachEvents() {
        // Save selection whenever cursor moves inside editor
        ['keyup', 'mouseup', 'focus'].forEach(evt => {
            this.editor.addEventListener(evt, () => this.saveSelection());
        });
        
        // Prevent modal buttons from clearing selection prematurely on mousedown
        this.container.querySelectorAll('.ce-btn').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                if (document.activeElement === this.editor) {
                    this.saveSelection();
                }
            });
        });

        // Command Buttons
        this.container.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                const val = btn.getAttribute('data-val') || null;
                this.execCommand(cmd, val);
            });
        });

        // Heading dropdown
        const headingSelect = this.container.querySelector('#ce-heading-select');
        headingSelect.addEventListener('change', (e) => {
            this.execCommand('formatBlock', e.target.value);
        });

        // History Buttons
        this.container.querySelector('#ce-btn-undo').addEventListener('click', () => this.undo());
        this.container.querySelector('#ce-btn-redo').addEventListener('click', () => this.redo());

        // Views & Layout
        this.container.querySelector('#ce-btn-source').addEventListener('click', () => this.toggleSourceView());
        this.container.querySelector('#ce-btn-max').addEventListener('click', () => this.toggleMaximize());

        // Code & Container Triggers
        this.container.querySelector('#ce-btn-code-inline').addEventListener('click', () => this.applyInlineCode());
        this.container.querySelector('#ce-btn-code-block').addEventListener('click', () => this.promptCodeBlock());
        this.container.querySelector('#ce-btn-callout').addEventListener('click', () => this.applyCallout());

        // Table Controls
        this.container.querySelector('#ce-btn-table-add').addEventListener('click', () => this.promptInsertTable());
        this.container.querySelector('#ce-btn-row-add').addEventListener('click', () => this.insertRow());
        this.container.querySelector('#ce-btn-row-del').addEventListener('click', () => this.deleteRow());
        this.container.querySelector('#ce-btn-col-add').addEventListener('click', () => this.insertColumn());
        this.container.querySelector('#ce-btn-col-del').addEventListener('click', () => this.deleteColumn());
        this.container.querySelector('#ce-btn-table-del').addEventListener('click', () => this.deleteTable());

        // Modal dialog triggers
        this.container.querySelector('#ce-btn-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.promptAddLink();
        });
        this.container.querySelector('#ce-btn-image').addEventListener('click', (e) => {
            e.preventDefault();
            this.promptAddImage();
        });
        this.container.querySelector('#ce-btn-video').addEventListener('click', (e) => {
            e.preventDefault();
            this.promptAddVideo();
        });

        // Modal Closures
        this.container.querySelector('#ce-modal-close-btn').addEventListener('click', () => this.closeModal());
        this.container.querySelector('#ce-modal-cancel').addEventListener('click', () => this.closeModal());

        // Input & Stats Tracking
        this.editor.addEventListener('input', () => {
            this.updateStats();
            this.saveState();
        });

        this.sourceArea.addEventListener('input', () => {
            this.updateStats();
        });
    }

    // --- Stats Calculation ---
    updateStats() {
        const text = this.isSourceView 
            ? this.sourceArea.value 
            : (this.editor.innerText || this.editor.textContent || '');

        const cleanText = text.trim();
        
        // Words count using regex boundary matching
        const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
        
        // Characters with and without spaces
        const chars = text.length;
        const charsNoSpace = text.replace(/\s/g, '').length;

        // Reading time assuming 200 words per minute
        const readTimeMinutes = Math.ceil(words / 200);

        this.statWords.textContent = words.toLocaleString();
        this.statChars.textContent = chars.toLocaleString();
        this.statCharsNoSpace.textContent = charsNoSpace.toLocaleString();
        this.statReadTime.textContent = words > 0 ? `${readTimeMinutes} min` : '0 min';
    }

    execCommand(command, value = null) {
        this.editor.focus();
        document.execCommand(command, false, value);
        this.updateStats();
        this.saveState();
    }

    saveState() {
        const html = this.editor.innerHTML;
        if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== html) {
            this.undoStack.push(html);
            if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
            this.redoStack = [];
        }
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.redoStack.push(this.undoStack.pop());
            this.editor.innerHTML = this.undoStack[this.undoStack.length - 1];
            this.updateStats();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.undoStack.push(state);
            this.editor.innerHTML = state;
            this.updateStats();
        }
    }

   saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            // Ensure selection belongs to the editor body before saving
            if (this.editor.contains(range.commonAncestorContainer)) {
                this.savedSelectionRange = range.cloneRange();
            } else {
                this.savedSelectionRange = null;
            }
        }
    }

    restoreSelection() {
        if (this.savedSelectionRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.savedSelectionRange);
        }
    }

   insertNodeAtCaret(node) {
        this.restoreSelection(); 
        this.editor.focus();

        const sel = window.getSelection();
        let inserted = false;

        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            
            // Strictly verify insertion target is inside .ce-content
            if (this.editor.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(node);
                
                // Move cursor directly after the inserted node
                range.setStartAfter(node);
                range.setEndAfter(node);
                sel.removeAllRanges();
                sel.addRange(range);
                inserted = true;
            }
        }

        // Fallback: strictly append to the editor element body, never parent containers
        if (!inserted) { 
            
            this.editor.appendChild(node); 
            // Move selection range to end of editor content instead of failing it...
            const newRange = document.createRange();
            newRange.selectNodeContents(this.editor);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
 
        this.saveSelection();
        this.updateStats();
        this.saveState();
    }

    // --- Public API ---
    get() {
        return this.isSourceView ? this.sourceArea.value : this.editor.innerHTML;
    }

    set(html) {
        this.editor.innerHTML = html;
        this.sourceArea.value = html;
        this.updateStats();
        this.saveState();
    }

    // --- Code & Callout Features ---
    applyInlineCode() {
        const sel = window.getSelection();
        if (!sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const code = document.createElement('code');
            code.className = 'ce-inline-code';
            code.appendChild(range.extractContents());
            range.insertNode(code);
            this.updateStats();
            this.saveState();
        }
    }

    promptCodeBlock() {
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString() : '';

        const html = `
            <div class="ce-field">
                <label>Code</label>
                <textarea id="ce-code-input" rows="6" placeholder="// Enter code here...">${selectedText}</textarea>
            </div>
        `;

        this.openModal('Insert Code Block', html, (body) => {
            const codeText = body.querySelector('#ce-code-input').value;
            if (!codeText) return;

            const pre = document.createElement('pre');
            pre.className = 'ce-code-block';
            const code = document.createElement('code');
            code.textContent = codeText;
            pre.appendChild(code);

            this.insertNodeAtCaret(pre);
        });
    }

    applyCallout() {
        const sel = window.getSelection();
        const div = document.createElement('div');
        div.className = 'ce-callout';

        if (!sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            div.appendChild(range.extractContents());
            range.insertNode(div);
        } else {
            div.textContent = 'Note or callout message goes here...';
            this.insertNodeAtCaret(div);
        }
        this.updateStats();
        this.saveState();
    }

    // --- Custom Modal Management ---
    openModal(title, fieldsHTML, onSubmit) {
        //this.saveSelection();
        this.container.querySelector('#ce-modal-title').textContent = title;
        const body = this.container.querySelector('#ce-modal-body');
        body.innerHTML = fieldsHTML;

        const submitBtn = this.container.querySelector('#ce-modal-submit');
        
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener('click', () => {
            onSubmit(body);
            this.closeModal();
        });

        this.modalOverlay.classList.add('ce-active');

        // Auto focus first field without breaking savedSelectionRange
        const firstInput = body.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }

    closeModal() {
        this.modalOverlay.classList.remove('ce-active');
    }

    // --- Dialog Operations ---
    promptAddLink() {
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString() : '';

        const html = `
            <div class="ce-field">
                <label>Display Text</label>
                <input type="text" id="ce-link-text" value="${selectedText}">
            </div>
            <div class="ce-field">
                <label>Link Type</label>
                <select id="ce-link-type">
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone (Call)</option>
                </select>
            </div>
            <div class="ce-field">
                <label>Target / Address</label>
                <input type="text" id="ce-link-url" placeholder="https://example.com">
            </div>
            <div class="ce-field">
                <label>Open In</label>
                <select id="ce-link-target">
                    <option value="_self">Same Window</option>
                    <option value="_blank">New Window (_blank)</option>
                </select>
            </div>
        `;

        this.openModal('Insert Link', html, (body) => {
            const text = body.querySelector('#ce-link-text').value || 'Link';
            const type = body.querySelector('#ce-link-type').value;
            let url = body.querySelector('#ce-link-url').value;
            const target = body.querySelector('#ce-link-target').value;

            if (type === 'email' && !url.startsWith('mailto:')) url = `mailto:${url}`;
            if (type === 'tel' && !url.startsWith('tel:')) url = `tel:${url}`;

            const a = document.createElement('a');
            a.textContent = text;
            a.href = url;
            a.target = target;

            this.insertNodeAtCaret(a);
        });
    }

    promptAddImage() {
        const html = `
            <div class="ce-field">
                <label>Image Source URL</label>
                <input type="text" id="ce-img-src" placeholder="https://example.com/image.jpg">
            </div>
            <div class="ce-field">
                <label>Alt Text</label>
                <input type="text" id="ce-img-alt" placeholder="Image Description">
            </div>
            <div class="ce-field-row">
                <div class="ce-field">
                    <label>Width (px or %)</label>
                    <input type="text" id="ce-img-width" placeholder="e.g. 300px or 100%">
                </div>
                <div class="ce-field">
                    <label>Height (px)</label>
                    <input type="text" id="ce-img-height" placeholder="auto">
                </div>
            </div>
        `;

        this.openModal('Insert Image', html, (body) => {
            const src = body.querySelector('#ce-img-src').value;
            if (!src) return;

            const img = document.createElement('img');
            img.src = src;
            img.alt = body.querySelector('#ce-img-alt').value || '';
            
            const width = body.querySelector('#ce-img-width').value;
            const height = body.querySelector('#ce-img-height').value;

            if (width) img.style.width = width;
            if (height) img.style.height = height;

            const wrapper = document.createElement('p');
            wrapper.appendChild(img);
            this.insertNodeAtCaret(wrapper);
        });
    }

    promptAddVideo() {
        const html = `
            <div class="ce-field">
                <label>Video / YouTube URL</label>
                <input type="text" id="ce-video-url" placeholder="https://www.youtube.com/watch?v=...">
            </div>
            <div class="ce-field-row">
                <div class="ce-field">
                    <label>Width</label>
                    <input type="text" id="ce-video-width" value="560">
                </div>
                <div class="ce-field">
                    <label>Height</label>
                    <input type="text" id="ce-video-height" value="315">
                </div>
            </div>
        `;

        this.openModal('Insert Video', html, (body) => {
            const url = body.querySelector('#ce-video-url').value;
            if (!url) return;

            let embedUrl = url;
            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (ytMatch && ytMatch[1]) {
                embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
            }

            const iframe = document.createElement('iframe');
            iframe.src = embedUrl;
            iframe.width = body.querySelector('#ce-video-width').value || '560';
            iframe.height = body.querySelector('#ce-video-height').value || '315';
            iframe.frameBorder = '0';
            iframe.allowFullscreen = true;

            const wrapper = document.createElement('p');
            wrapper.appendChild(iframe);
            this.insertNodeAtCaret(wrapper);
        });
    }

    promptInsertTable() {
        const html = `
            <div class="ce-field-row">
                <div class="ce-field">
                    <label>Rows</label>
                    <input type="number" id="ce-table-rows" value="2" min="1">
                </div>
                <div class="ce-field">
                    <label>Columns</label>
                    <input type="number" id="ce-table-cols" value="2" min="1">
                </div>
            </div>
        `;

        this.openModal('Insert Table', html, (body) => {
            const rows = parseInt(body.querySelector('#ce-table-rows').value, 10) || 2;
            const cols = parseInt(body.querySelector('#ce-table-cols').value, 10) || 2;

            const table = document.createElement('table');
            for (let i = 0; i < rows; i++) {
                const tr = table.insertRow();
                for (let j = 0; j < cols; j++) {
                    const td = tr.insertCell();
                    td.textContent = 'Cell';
                }
            }

            this.insertNodeAtCaret(table);
        });
    }

    // --- Context Table Operations ---
    findParentTable() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        let node = sel.anchorNode;
        while (node && node !== this.editor) {
            if (node.nodeName === 'TABLE') return node;
            node = node.parentNode;
        }
        return null;
    }

    getSelectedCell() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        let node = sel.anchorNode;
        while (node && node !== this.editor) {
            if (node.nodeName === 'TD' || node.nodeName === 'TH') return node;
            node = node.parentNode;
        }
        return null;
    }

    insertRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentElement;
        const table = this.findParentTable();
        const newRow = table.insertRow(row.rowIndex + 1);
        for (let i = 0; i < row.cells.length; i++) {
            const newCell = newRow.insertCell();
            newCell.textContent = 'Cell';
        }
        this.updateStats();
        this.saveState();
    }

    deleteRow() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const row = cell.parentElement;
        const table = this.findParentTable();
        table.deleteRow(row.rowIndex);
        this.updateStats();
        this.saveState();
    }

    insertColumn() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const colIndex = cell.cellIndex;
        const table = this.findParentTable();
        for (let i = 0; i < table.rows.length; i++) {
            const newCell = table.rows[i].insertCell(colIndex + 1);
            newCell.textContent = 'Cell';
        }
        this.updateStats();
        this.saveState();
    }

    deleteColumn() {
        const cell = this.getSelectedCell();
        if (!cell) return;
        const colIndex = cell.cellIndex;
        const table = this.findParentTable();
        for (let i = 0; i < table.rows.length; i++) {
            table.rows[i].deleteCell(colIndex);
        }
        this.updateStats();
        this.saveState();
    }

    deleteTable() {
        const table = this.findParentTable();
        if (table) {
            table.remove();
            this.updateStats();
            this.saveState();
        }
    }

    // --- Views & Layout ---
    toggleSourceView() {
        if (this.isSourceView) {
            this.editor.innerHTML = this.sourceArea.value;
            this.sourceArea.style.display = 'none';
            this.editor.style.display = 'block';
            this.updateStats();
            this.saveState();
        } else {
            this.sourceArea.value = this.editor.innerHTML;
            this.editor.style.display = 'none';
            this.sourceArea.style.display = 'block';
            this.updateStats();
        }
        this.isSourceView = !this.isSourceView;
    }

    //toggle
    toggleMaximize() {
        this.isMaximized = !this.isMaximized;
        this.wrapper.classList.toggle('ce-maximized', this.isMaximized);
    }
} 