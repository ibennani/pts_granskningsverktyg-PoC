// js/components/MetadataDisplayComponent.js
export const MetadataDisplayComponent = (function () {
    'use-strict';

    // const CSS_PATH = 'css/components/metadata_display_component.css';
    // let css_loaded = false;

    let local_parentElement;
    let local_dataToDisplay;
    let local_configArray;
    let local_t;
    let local_Helpers;

    // async function load_styles_if_needed() { /* ... */ }

    function get_value_from_path(obj, path) {
        if (!path || typeof path !== 'string') return undefined;
        return path.split('.').reduce((current_obj, key) => (current_obj && current_obj[key] !== undefined) ? current_obj[key] : undefined, obj);
    }

    function render() {
        if (!local_parentElement || !local_dataToDisplay || !local_configArray || !local_t || !local_Helpers || !local_Helpers.create_element) {
            console.error("MetadataDisplayComponent: Cannot render, essential dependencies or data missing.");
            if (local_parentElement) local_parentElement.innerHTML = `<p>${local_t ? local_t('error_render_component', {componentName: 'MetadataDisplay'}) : 'Error rendering metadata.'}</p>`;
            return;
        }

        local_parentElement.innerHTML = '';

        local_configArray.forEach(field_config => {
            if (field_config.isVisibleWhen && typeof field_config.isVisibleWhen === 'function') {
                if (!field_config.isVisibleWhen(local_dataToDisplay)) {
                    return;
                }
            }

            const raw_value = get_value_from_path(local_dataToDisplay, field_config.valuePath);

            if ((raw_value === null || raw_value === undefined || String(raw_value).trim() === '') && !field_config.showWhenEmptyAs) {
                if (!field_config.showWhenEmpty) { // Om inte ens tomma fält ska visas med fallback
                    return;
                }
            }
            
            const item_div = local_Helpers.create_element('div', { class_name: field_config.itemClass || 'info-item' });
            const p = local_Helpers.create_element('p');

            const strong = local_Helpers.create_element('strong', { text_content: local_t(field_config.labelKey) + ':' });
            p.appendChild(strong);
            p.appendChild(document.createTextNode(' '));

            const value_span = local_Helpers.create_element('span', { class_name: 'value' });
            let display_value_text;

            // Använd formatter om den finns
            if (typeof field_config.formatter === 'function') {
                display_value_text = field_config.formatter(raw_value, local_dataToDisplay, local_t);
            } else {
                // Annars, använd befintlig logik för att bestämma display_value
                if ((raw_value === null || raw_value === undefined || String(raw_value).trim() === '') && field_config.showWhenEmptyAs) {
                    display_value_text = local_t(field_config.showWhenEmptyAs.labelKey, { defaultValue: field_config.showWhenEmptyAs.defaultValue || '---'});
                    value_span.classList.add('text-muted');
                } else if (raw_value === null || raw_value === undefined || String(raw_value).trim() === '') {
                    display_value_text = '---'; // Standard fallback om showWhenEmptyAs inte är specificerat
                    value_span.classList.add('text-muted');
                } else {
                    display_value_text = raw_value; // Behåll råvärdet för vidare typ-specifik hantering
                }
            }


            // Om formatter redan har returnerat en sträng, använd den.
            // Annars, fortsätt med typ-specifik hantering.
            if (typeof display_value_text === 'string' && typeof field_config.formatter === 'function') {
                // Om formatter returnerade en sträng, och det inte är en HTML-sträng vi förväntar oss.
                // För säkerhets skull, om type är html men formatter returnerar vanlig text, escapa den.
                // Om type INTE är html, escapa alltid.
                if (field_config.type === 'html') {
                     value_span.innerHTML = display_value_text; // Anta att formatter returnerar säker HTML för typen 'html'
                } else {
                    value_span.textContent = local_Helpers.escape_html ? local_Helpers.escape_html(display_value_text) : display_value_text;
                }
            } else {
                 // Om display_value_text fortfarande är råvärdet (inte en sträng från formatter)
                 // eller om det är en typ som kräver specifik DOM-manipulation (t.ex. länk)
                let value_to_process = (typeof field_config.formatter === 'function') ? display_value_text : raw_value;

                // Fallback om showWhenEmptyAs gav oss en sträng men raw_value var null/undefined för typkontrollen nedan
                if ((raw_value === null || raw_value === undefined || String(raw_value).trim() === '') && field_config.showWhenEmptyAs) {
                     value_span.textContent = display_value_text; // Som redan är satt till fallback-texten
                } else if (raw_value === null || raw_value === undefined || String(raw_value).trim() === '') {
                     value_span.textContent = '---';
                     value_span.classList.add('text-muted');
                }
                else {
                    switch (field_config.type) {
                        case 'link':
                            if (value_to_process && String(value_to_process).trim()) {
                                const safe_link = local_Helpers.add_protocol_if_missing(String(value_to_process));
                                const link_element = local_Helpers.create_element('a', {
                                    href: safe_link,
                                    text_content: String(value_to_process),
                                    attributes: { target: '_blank', rel: 'noopener noreferrer' }
                                });
                                value_span.appendChild(link_element);
                            } else {
                                value_span.textContent = '---'; value_span.classList.add('text-muted');
                            }
                            break;
                        case 'date':
                            if (value_to_process && local_Helpers.format_iso_to_local_datetime) {
                                value_span.textContent = local_Helpers.format_iso_to_local_datetime(String(value_to_process));
                            } else {
                                value_span.textContent = '---'; value_span.classList.add('text-muted');
                            }
                            break;
                        case 'html':
                            if (value_to_process && String(value_to_process).trim()) {
                                value_span.innerHTML = String(value_to_process);
                            } else {
                                value_span.textContent = '---'; value_span.classList.add('text-muted');
                            }
                            break;
                        case 'boolean':
                            if (typeof value_to_process === 'boolean') {
                                value_span.textContent = value_to_process ? local_t('yes', {defaultValue: 'Yes'}) : local_t('no', {defaultValue: 'No'});
                            } else {
                                value_span.textContent = '---'; value_span.classList.add('text-muted');
                            }
                            break;
                        case 'text':
                        default:
                            if (value_to_process !== undefined && value_to_process !== null) {
                                if (typeof value_to_process === 'string' && value_to_process.includes('\n')) {
                                    const lines = value_to_process.split('\n');
                                    lines.forEach((line, index) => {
                                        if (index > 0) value_span.appendChild(local_Helpers.create_element('br'));
                                        value_span.appendChild(document.createTextNode(local_Helpers.escape_html ? local_Helpers.escape_html(line) : line));
                                    });
                                } else {
                                    value_span.textContent = local_Helpers.escape_html ? local_Helpers.escape_html(String(value_to_process)) : String(value_to_process);
                                }
                            } else {
                                value_span.textContent = '---'; value_span.classList.add('text-muted');
                            }
                            break;
                    }
                }
            }
            p.appendChild(value_span);
            item_div.appendChild(p);
            local_parentElement.appendChild(item_div);
        });
    }

    async function init(_parent_element, _data_to_display, _config_array, _t_function, _helpers_object) {
        local_parentElement = _parent_element;
        local_dataToDisplay = _data_to_display;
        local_configArray = _config_array;
        local_t = _t_function;
        local_Helpers = _helpers_object;
        // await load_styles_if_needed();
    }

    function destroy() {
        if (local_parentElement) {
            local_parentElement.innerHTML = '';
        }
        local_parentElement = null;
        local_dataToDisplay = null;
        local_configArray = null;
        local_t = null;
        local_Helpers = null;
    }

    return {
        init,
        render,
        destroy
    };
})();