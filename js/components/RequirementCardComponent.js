// file: js/components/RequirementCardComponent.js

// KORRIGERAD SÖKVÄG till helpers.js
import { create_element, load_css, add_protocol_if_missing } from '../utils/helpers.js';

// KORRIGERAD SÖKVÄG till translation_logic.js
import { t as imported_t_reqcard } from '../translation_logic.js';

const RequirementCardComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css'; // Relativt till index.html
    let css_loaded = false;

    async function load_styles_if_needed_internal() {
        if (!css_loaded && typeof load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await load_css(CSS_PATH);
                    css_loaded = true;
                } catch (error) { console.warn("Failed to load CSS for RequirementCardComponent:", error); }
            } else { css_loaded = true; }
        } else if (!css_loaded && typeof load_css !== 'function') {
            console.warn("RequirementCardComponent: load_css (importerad) not available.");
        }
    }

    async function create_card_element_internal(requirement, sample_id, requirement_status, router_cb) {
        await load_styles_if_needed_internal();

        if (typeof create_element !== 'function' || typeof imported_t_reqcard !== 'function') {
            console.error("RequirementCardComponent: create_element or t (importerad) not available!");
            const el = document.createElement('li'); // Standard DOM API som fallback
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
            text_content: requirement.title,
            // attributes: { 'aria-label': imported_t_reqcard('requirement_card_aria_label', { title: requirement.title, reference: requirement.standardReference?.text || '', statusText: imported_t_reqcard(`audit_status_${requirement_status}`) }) }
        });
        title_button.addEventListener('click', () => {
            if (router_cb && typeof router_cb === 'function') {
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.key || requirement.id });
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
                    attributes: { href: url_to_use, target: '_blank', rel: 'noopener noreferrer' }
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
        create: create_card_element_internal
    };

    return public_api;
})();

export const RequirementCardComponent = RequirementCardComponent_internal;