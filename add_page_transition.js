const fs = require('fs');
const path = require('path');

const cssToInject = `
  <style>
    /* Page Transition Overlay */
    #page-transition-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #ffffff;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
      opacity: 1;
      visibility: visible;
    }
    #page-transition-overlay.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .page-transition-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(15, 23, 42, 0.1);
      border-top: 3px solid #0f172a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-top: 20px;
    }
    .page-transition-logo {
      height: 70px;
      object-fit: contain;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    /* Hide scrollbar during transition to prevent layout shift */
    body.transitioning {
      overflow: hidden;
    }
  </style>
`;

const htmlToInject = `
  <div id="page-transition-overlay">
    <img src="logo.png?v=5" alt="AGS Technology Logo" class="page-transition-logo">
    <div class="page-transition-spinner"></div>
  </div>
`;

const jsToInject = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const overlay = document.getElementById('page-transition-overlay');
      
      const hideOverlay = () => {
        if (overlay) {
          overlay.classList.add('hidden');
          document.body.classList.remove('transitioning');
        }
      };

      // Add transitioning class initially
      document.body.classList.add('transitioning');

      // Wait for full load (including images, iframes, etc.)
      window.addEventListener('load', hideOverlay);
      
      // Fallback in case 'load' takes too long (max 2 seconds to prevent being stuck)
      setTimeout(hideOverlay, 2000);

      // Handle pages shown from bfcache (back/forward navigation)
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          hideOverlay();
        }
      });

      // Intercept link clicks
      document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
          // Exclude target="_blank"
          if (this.target === '_blank') return;
          
          const href = this.getAttribute('href');
          // Exclude empty links, anchors, or js/mail links
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
          
          // Exclude external domains
          if (this.hostname !== window.location.hostname && this.hostname !== '') return;
          
          // Exclude special classes
          if (this.classList.contains('no-transition')) return;
          
          // Exclude modifier keys (open in new tab)
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

          e.preventDefault();
          
          if (overlay) {
            document.body.classList.add('transitioning');
            overlay.classList.remove('hidden');
          }
          
          // Navigate after a short delay to let the animation start
          setTimeout(() => {
            window.location.href = this.href;
          }, 150); // 150ms delay makes it feel natural without lagging
        });
      });
    });
  </script>
`;

const directoryPath = path.join(__dirname);

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  } 

  let updatedCount = 0;
  files.forEach((file) => {
    if (path.extname(file) === '.html') {
      const filePath = path.join(directoryPath, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Remove existing injected code if any (to allow re-running)
      content = content.replace(/<style>[\s\S]*?#page-transition-overlay[\s\S]*?<\/style>/, '');
      content = content.replace(/<div id="page-transition-overlay">[\s\S]*?<\/div>/, '');
      content = content.replace(/<script>[\s\S]*?page-transition-overlay[\s\S]*?<\/script>/, '');

      // Inject CSS just before </head>
      if (content.includes('</head>')) {
        content = content.replace('</head>', cssToInject + '</head>');
      }

      // Inject HTML just after <body>
      if (content.match(/<body[^>]*>/)) {
        content = content.replace(/(<body[^>]*>)/, '$1\n' + htmlToInject);
      }

      // Inject JS just before </body>
      if (content.includes('</body>')) {
        content = content.replace('</body>', jsToInject + '</body>');
      }

      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
      console.log('✅ Updated', file);
    }
  });
  console.log(\`\n🎉 Successfully added smooth page transitions to \${updatedCount} HTML files!\`);
});
