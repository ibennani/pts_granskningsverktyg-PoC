// js/logic/save_audit_logic.js
(function () { // IIFE start
    'use-strict';

    // Ta bort beroenden av globala window.Translation och window.NotificationComponent
    // Dessa skickas nu in som argument till save_audit_to_json_file.

    function _generate_filename(audit_data, t_func_param) { // ÄNDRAD: Tar emot t_func_param
        const now = new Date();
        const date_str = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        let actor_name_part = 'granskning';

        if (audit_data && audit_data.auditMetadata && audit_data.auditMetadata.actorName) {
            actor_name_part = audit_data.auditMetadata.actorName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'granskning';
        }
        // Använd t_func_param för att hämta översättning om det behövs för filnamnet (mindre troligt här)
        // Exempel: const default_filename_text = t_func_param('default_audit_filename_part', {defaultValue: 'granskning'});
        return `tillganglighetsgranskning_${actor_name_part}_${date_str}.json`;
    }

    // ÄNDRAD: Funktionen tar nu emot t_func och show_notification_func som argument
    function save_audit_to_json_file(current_audit_data, t_func_param, show_notification_func_param) {
        if (!current_audit_data) {
            if (show_notification_func_param && t_func_param) {
                show_notification_func_param(t_func_param('no_audit_data_to_save'), 'error');
            } else {
                console.error("[SaveAuditLogic] No audit data provided and/or t_func/show_notification_func missing.");
            }
            return;
        }
        if (!t_func_param || !show_notification_func_param) {
            console.error("[SaveAuditLogic] t_func_param or show_notification_func_param is missing.");
            // Fallback till console.log om notifieringssystemet inte är tillgängligt
            console.log("Attempting to save audit data without full notification/translation capabilities.");
        }


        const t_for_filename = t_func_param || ((key, rep) => (rep && rep.defaultValue ? rep.defaultValue : key));
        const filename = _generate_filename(current_audit_data, t_for_filename);
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

        const t_for_message = t_func_param || ((key, rep) => (rep && rep.defaultValue ? rep.defaultValue : `**${key}**`));
        const show_notify = show_notification_func_param || console.log;

        show_notify(t_for_message('audit_saved_as_file', { filename: filename }), 'success');
        console.log(`[SaveAuditLogic] Audit saved as ${filename}`);
    }

    window.SaveAuditLogic = {
        save_audit_to_json_file
    };

    // console.log("[save_audit_logic.js] SaveAuditLogic loaded and assigned to window.");
})();