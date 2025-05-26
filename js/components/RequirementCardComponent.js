// file: js/components/RequirementCardComponent.js

// NYTT: Importera create_element och load_css (och add_protocol_if_missing)
import { create_element, load_css, add_protocol_if_missing } from '../../utils/helpers.js'; // Justerad sökväg

const RequirementCardComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css';
    let css_loaded = false;

    function get_t_func_local_scope() { // Omdöpt för tydlighet
        // Fortsätter att hämta från window.Translation tills vidare
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (ReqCard t not found)";
            };
    }

    async function load_styles_if_needed_internal() { // Omdöpt
        // Använd importerad load_css
        if (!css_loaded && typeof load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await load_css(CSS_PATH);
                    css_loaded = true;
                } catch (error) {
                    console.warn("Failed to load CSS for RequirementCardComponent:", error);
                }
            } else {
                css_loaded = true;
            }
        } else if (!css_loaded) {
            // console.warn("RequirementCardComponent: load_css (importerad) not available or CSS already loaded state unknown.");
        }
    }

    function create_card_element_internal(requirement, sample_id, requirement_status, router_cb) { // Omdöpt
        load_styles_if_needed_internal();

        const t = get_t_func_local_scope();
        // Använd importerad create_element och add_protocol_if_missing
        if (typeof create_element !== 'function') {
            console.error("RequirementCardComponent: create_element (importerad) not available!");
            const el = document.createElement('li'); // Enkel fallback
            el.textContent = requirement.title || "Error creating card";
            return el;
        }
        const add_proto_func = typeof add_protocol_if_missing === 'function' ? add_protocol_if_missing : (url) => url;


        const card_li = create_element('li', { class_name: 'requirement-card' });
        const card_content_wrapper = create_element('div', { class_name: 'requirement-card-inner-content' });

        const indicator = create_element('span', {
            class_name: ['status-indicator', `status-${requirement_status}`],
            attributes: { 'aria-hidden': 'true' }
        });
        card_content_wrapper.appendChild(indicator);

        const text_content_div = create_element('div', { class_name: 'requirement-card-text-content' });

        const title_h_container = create_element('h3', { class_name: 'requirement-card-title-container'});
        const title_button = create_element('button', {
            class_name: 'requirement-card-title-button',
            text_content: requirement.title
        });
        title_button.addEventListener('click', () => {
            if (router_cb && typeof router_cb === 'function') {
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.key || requirement.id });
            } else {
                // console.warn("RequirementCard: router_cb not provided or not a function for title navigation.");
            }
        });
        title_h_container.appendChild(title_button);
        text_content_div.appendChild(title_h_container);

        if (requirement.standardReference && requirement.standardReference.text) {
            let reference_element;
            if (requirement.standardReference.url) {
                const url_to_use = add_proto_func(requirement.standardReference.url);
                reference_element = create_element('a', {
                    class_name: 'requirement-card-reference-link',
                    text_content: requirement.standardReference.text,
                    attributes: {
                        href: url_to_use,
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }
                });
            } else {
                reference_element = create_element('span', {
                    class_name: 'requirement-card-reference-text',
                    text_content: requirement.standardReference.text
                });
            }
            const ref_wrapper = create_element('div', {class_name: 'requirement-card-reference-wrapper'});
            ref_wrapper.appendChild(reference_element);
            text_content_div.appendChild(ref_wrapper);
        }
        card_content_wrapper.appendChild(text_content_div);
        card_li.appendChild(card_content_wrapper);

        return card_li;
    }

    const public_api = {
        create: create_card_element_internal // Exponera den omdöpta interna funktionen som 'create'
    };

    return public_api;
})();

export const RequirementCardComponent = RequirementCardComponent_internal;