// js/logic/save_audit_logic.js
(function () { // IIFE start
    'use-strict';

    function _generate_filename(audit_data, t_func) {
        const now = new Date();
        const time_str = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const datetime_str = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${time_str}`;
        
        let actor_name_part = 'granskning';

        if (audit_data && audit_data.auditMetadata && audit_data.auditMetadata.actorName) {
            actor_name_part = audit_data.auditMetadata.actorName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'granskning';
        }
        
        return `tillganglighetsgranskning_${actor_name_part}_${datetime_str}.json`;
    }

    function save_audit_to_json_file(current_audit_data, t_func, show_notification_func) {
        if (!current_audit_data) {
            if (show_notification_func) show_notification_func(t_func('no_audit_data_to_save'), 'error');
            console.error("[SaveAuditLogic] No audit data provided to save.");
            return;
        }

        const filename = _generate_filename(current_audit_data, t_func);
        const data_str = JSON.stringify(current_audit_data, null, 2);
        const blob = new Blob([data_str], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // --- NYTT: Rensa autosave efter en lyckad manuell sparning ---
        if (window.Store && typeof window.Store.clearAutosavedState === 'function') {
            window.Store.clearAutosavedState();
        }
        // --- SLUT PÅ NYTT ---

        if (show_notification_func) show_notification_func(t_func('audit_saved_as_file', { filename: filename }), 'success');
        console.log(`[SaveAuditLogic] Audit saved as ${filename}`);
    }

    window.SaveAuditLogic = {
        save_audit_to_json_file
    };

    console.log("[save_audit_logic.js] SaveAuditLogic loaded.");
})();