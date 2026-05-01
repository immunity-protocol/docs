/**
 * Copy-to-clipboard buttons for code blocks.
 *
 * Wraps each <pre> inside the .prose container with a wrapper div and adds a
 * copy button. Clicking the button copies the code text to the clipboard and
 * shows a brief "Copied!" confirmation.
 */
(function () {
    'use strict';

    document.querySelectorAll('.prose pre').forEach(function (pre) {
        var wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        var btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.type = 'button';
        btn.title = 'Copy code';
        btn.setAttribute('aria-label', 'Copy code to clipboard');
        btn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">' +
            '<path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>' +
            '<path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/>' +
            '</svg>';

        btn.addEventListener('click', function () {
            var code = pre.querySelector('code');
            var text = code ? code.textContent : pre.textContent;

            navigator.clipboard.writeText(text).then(function () {
                btn.classList.add('copied');
                btn.innerHTML =
                    '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">' +
                    '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>' +
                    '</svg>';

                setTimeout(function () {
                    btn.classList.remove('copied');
                    btn.innerHTML =
                        '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">' +
                        '<path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/>' +
                        '<path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/>' +
                        '</svg>';
                }, 2000);
            });
        });

        wrapper.appendChild(btn);
    });
})();
