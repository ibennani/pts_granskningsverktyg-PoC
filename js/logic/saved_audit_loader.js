// js/logic/saved_audit_loader.js
// Denna modul hanterar logiken för att ladda och processa en sparad JSON-granskningsfil.

export const SavedAuditLoader = (function () {
    'use-strict';

    async function loadAndProcessSavedAudit(
        fileObject,
        validationLogic,            // Förväntas nu vara ett objekt, t.ex. { validate_saved_audit_file: func }
        dispatchFunction,
        storeActionTypeForLoad,
        getStateFunction,
        tFunction,
        notificationFunction,
        successCallback,
        errorCallback
    ) {
        if (!fileObject) {
            if (errorCallback) errorCallback(tFunction('error_no_file_selected', { defaultValue: "No file selected."}));
            return;
        }

        if (fileObject.type !== "application/json") {
            if (errorCallback) errorCallback(tFunction('error_file_must_be_json'));
            return;
        }

        const reader = new FileReader();

        reader.onload = async function (e) {
            try {
                const file_content_object = JSON.parse(e.target.result);
                // ÄNDRAD: Anropa funktionen via det inskickade objektet
                const validation_result = validationLogic.validate_saved_audit_file(file_content_object);

                if (validation_result.isValid) {
                    const current_app_state = getStateFunction();
                    const current_app_state_version = current_app_state.saveFileVersion;

                    if (file_content_object.saveFileVersion > current_app_state_version) {
                        console.warn(`[SavedAuditLoader] Save file version (${file_content_object.saveFileVersion}) is newer than app state version (${current_app_state_version}).`);
                        if (notificationFunction) {
                            notificationFunction(
                                tFunction('warning_save_file_newer_version', {
                                    fileVersionInFile: file_content_object.saveFileVersion,
                                    appVersion: current_app_state_version
                                }),
                                'warning', 8000);
                        }
                    }

                    dispatchFunction({
                        type: storeActionTypeForLoad,
                        payload: file_content_object
                    });

                    if (notificationFunction) notificationFunction(tFunction('saved_audit_loaded_successfully'), 'success');
                    if (successCallback) successCallback();

                } else {
                    if (errorCallback) errorCallback(validation_result.message);
                }
            } catch (error) {
                console.error("[SavedAuditLoader] Error parsing JSON from saved audit file:", error);
                if (errorCallback) errorCallback(tFunction('error_invalid_saved_audit_file'));
            }
        };

        reader.onerror = function () {
            console.error("[SavedAuditLoader] Error reading saved audit file.");
            if (errorCallback) errorCallback(tFunction('error_file_read_error'));
        };

        reader.readAsText(fileObject);
    }

    return {
        loadAndProcessSavedAudit
    };
})();