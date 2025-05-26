// js/components/MetadataDisplayComponent.js
export const MetadataDisplayComponent = (function () {
    'use-strict';

    // const CSS_PATH = 'css/components/metadata_display_component.css'; // Om vi skapar egen CSS
    // let css_loaded = false;

    let local_parentElement;
    let local_dataToDisplay;
    let local_configArray;
    let local_t;
    let local_Helpers;

    // async function load_styles_if_needed() {
    //     if (!css_loaded && local_Helpers && typeof local_Helpers.load_css === 'function' && CSS_PATH) {
    //         // ... (laddningslogik för CSS) ...
    //         css_loaded = true;
    //     }
    // }

    // Hjälpfunktion för att hämta nästlade värden
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

        local_parentElement.innerHTML = ''; // Rensa tidigare innehåll

        local_configArray.forEach(field_config => {
            // Kolla om fältet ska visas baserat på isVisibleWhen-funktionen
            if (field_config.isVisibleWhen && typeof field_config.isVisibleWhen === 'function') {
                if (!field_config.isVisibleWhen(local_dataToDisplay)) {
                    return; // Hoppa över detta fält
                }
            }

            const value = get_value_from_path(local_dataToDisplay, field_config.valuePath);

            // Hoppa över rendering om värdet är null eller undefined, såvida inte en 'showWhenEmpty' flagga finns
            if ((value === null || value === undefined || String(value).trim() === '') && !field_config.showWhenEmpty) {
                 // Om vi vill visa även tomma fält kan vi lägga till en fallback-text här
                if (field_config.showWhenEmptyAs) {
                    // Fortsätt och rendera med fallback-text
                } else {
                    return;
                }
            }

            // Skapa .info-item div (eller använd en klass från config om vi vill ha mer flexibilitet)
            const item_div = local_Helpers.create_element('div', { class_name: field_config.itemClass || 'info-item' }); // Använd itemClass från config eller default
            const p = local_Helpers.create_element('p'); // Allt inom en <p> per rad

            const strong = local_Helpers.create_element('strong', { text_content: local_t(field_config.labelKey) + ':' });
            p.appendChild(strong);
            p.appendChild(document.createTextNode(' ')); // Mellanslag efter etikett

            const value_span = local_Helpers.create_element('span', { class_name: 'value' });

            let display_value = value;
            if ((value === null || value === undefined || String(value).trim() === '') && field_config.showWhenEmptyAs) {
                display_value = local_t(field_config.showWhenEmptyAs.labelKey, { defaultValue: field_config.showWhenEmptyAs.defaultValue || '---'});
                value_span.classList.add('text-muted');
            }


            switch (field_config.type) {
                case 'link':
                    if (display_value && String(display_value).trim()) {
                        const safe_link = local_Helpers.add_protocol_if_missing(String(display_value));
                        const link_element = local_Helpers.create_element('a', {
                            href: safe_link,
                            text_content: String(display_value), // Visa originalvärdet som text
                            attributes: { target: '_blank', rel: 'noopener noreferrer' }
                        });
                        value_span.appendChild(link_element);
                    } else if (field_config.showWhenEmptyAs) {
                        value_span.textContent = display_value;
                    } else {
                         value_span.textContent = '---'; value_span.classList.add('text-muted');
                    }
                    break;
                case 'date':
                    if (display_value && local_Helpers.format_iso_to_local_datetime) {
                        value_span.textContent = local_Helpers.format_iso_to_local_datetime(String(display_value));
                    } else if (field_config.showWhenEmptyAs) {
                        value_span.textContent = display_value;
                    } else {
                        value_span.textContent = '---'; value_span.classList.add('text-muted');
                    }
                    break;
                case 'html': // Förutsätter att HTML-innehållet är säkert eller sanerat innan
                    if (display_value && String(display_value).trim()) {
                        value_span.innerHTML = String(display_value); // Använd display_value här
                    } else if (field_config.showWhenEmptyAs) {
                        value_span.textContent = display_value;
                    } else {
                         value_span.textContent = '---'; value_span.classList.add('text-muted');
                    }
                    break;
                case 'boolean':
                    if (typeof display_value === 'boolean') {
                        value_span.textContent = display_value ? local_t('yes', {defaultValue: 'Yes'}) : local_t('no', {defaultValue: 'No'});
                    } else if (field_config.showWhenEmptyAs) {
                        value_span.textContent = display_value;
                    } else {
                        value_span.textContent = '---'; value_span.classList.add('text-muted');
                    }
                    break;
                case 'text':
                default:
                    if (display_value !== undefined && display_value !== null) {
                        // Hantera flerradiga strängar genom att ersätta \n med <br>
                        if (typeof display_value === 'string' && display_value.includes('\n')) {
                            const lines = display_value.split('\n');
                            lines.forEach((line, index) => {
                                if (index > 0) value_span.appendChild(local_Helpers.create_element('br'));
                                value_span.appendChild(document.createTextNode(local_Helpers.escape_html ? local_Helpers.escape_html(line) : line));
                            });
                        } else {
                            value_span.textContent = local_Helpers.escape_html ? local_Helpers.escape_html(String(display_value)) : String(display_value);
                        }
                    } else if (field_config.showWhenEmptyAs) {
                         value_span.textContent = display_value;
                    } else {
                        value_span.textContent = '---'; value_span.classList.add('text-muted');
                    }
                    break;
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

        // await load_styles_if_needed(); // Om vi har egen CSS för komponenten
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