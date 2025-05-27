// js/logic/rule_file_loader.js
// Denna modul hanterar logiken för att ladda och processa en JSON-regelfil.

export const RuleFileLoader = (function () {
    'use-strict';

    async function loadAndProcessRuleFile(
        fileObject,
        validationLogic,            // Förväntas nu vara ett objekt, t.ex. { validate_rule_file_json: func }
        dispatchFunction,
        storeActionTypeForInitialize,
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
                const json_content = JSON.parse(e.target.result);
                // ÄNDRAD: Anropa funktionen via det inskickade objektet
                const validation_result = validationLogic.validate_rule_file_json(json_content);

                if (validation_result.isValid) {
                    if (notificationFunction) notificationFunction(validation_result.message, 'success');

                    dispatchFunction({
                        type: storeActionTypeForInitialize,
                        payload: { ruleFileContent: json_content }
                    });

                    if (successCallback) successCallback();

                } else {
                    if (errorCallback) errorCallback(validation_result.message);
                }
            } catch (error) {
                console.error("[RuleFileLoader] Error parsing JSON from rule file:", error);
                if (errorCallback) errorCallback(tFunction('rule_file_invalid_json'));
            }
        };

        reader.onerror = function () {
            console.error("[RuleFileLoader] Error reading rule file.");
            if (errorCallback) errorCallback(tFunction('error_file_read_error'));
        };

        reader.readAsText(fileObject);
    }

    return {
        loadAndProcessRuleFile
    };
})();