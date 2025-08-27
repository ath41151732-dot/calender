
// theme_patch_light_weekday_fix.js
// Fix: In LIGHT mode, when clicking a date, the weekday label text becomes white and disappears.
// This patch forces selected weekday labels to use the normal text color.
//
// Usage: load AFTER your theme script:
// <script src="theme_switch_slider_inline.js"></script>
// <script src="theme_patch_light_weekday_fix.js"></script>

(function(){
  const css = `
    /* Base weekday header color in light */
    [data-theme="light"] .weekdays,
    [data-theme="light"] .weekdays * {
      color: #334155;
    }

    /* When a date/cell is selected, ensure weekday label stays readable */
    [data-theme="light"] .weekdays .selected,
    [data-theme="light"] .weekdays .active,
    [data-theme="light"] .weekdays li.selected,
    [data-theme="light"] .weekdays li.active,
    [data-theme="light"] .cell.selected .weekday,
    [data-theme="light"] .cell.selected .dow,
    [data-theme="light"] .cell.selected .w,
    [data-theme="light"] .cell.is-selected .weekday,
    [data-theme="light"] .cell.is-selected .dow,
    [data-theme="light"] .cell.selected .weekday *,
    [data-theme="light"] .cell.selected .dow * {
      color: var(--text) !important;
    }

    /* Optional subtle tag if you have small weekday badges */
    [data-theme="light"] .cell.selected .weekday-badge,
    [data-theme="light"] .cell.selected .dow-badge {
      background: rgba(79,70,229,.10);
      color: var(--text) !important;
      border-color: rgba(79,70,229,.25);
    }

    /* Today in light mode: keep visible and distinct */
    [data-theme="light"] .weekdays .today,
    [data-theme="light"] .cell.today .weekday,
    [data-theme="light"] .cell.today .dow {
      color: var(--today) !important;
      font-weight: 700;
    }
  `;

  const style = document.createElement('style');
  style.id = 'theme-patch-light-weekday';
  style.textContent = css;
  document.head.appendChild(style);
})();
