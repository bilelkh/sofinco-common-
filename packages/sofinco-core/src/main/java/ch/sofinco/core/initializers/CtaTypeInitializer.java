package ch.sofinco.core.initializers;

import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.ValueImpl;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;

import javax.jcr.PropertyType;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component(
    name    = "ctaTypeInitializer",
    service = ModuleChoiceListInitializer.class,
    immediate = true
)
public class CtaTypeInitializer implements ModuleChoiceListInitializer {

    private String key = "ctaTypeInitializer";

    @Override
    public void setKey(String key) {
        this.key = key;
    }

    @Override
    public String getKey() {
        return key;
    }

    @Override
    public List<ChoiceListValue> getChoiceListValues(
            ExtendedPropertyDefinition epd,
            String param,
            List<ChoiceListValue> values,
            Locale locale,
            Map<String, Object> context) {

        List<ChoiceListValue> list = new ArrayList<>();

        if (context == null) {
            return list;
        }

        list.add(make("Lien interne (Vers une page du site)",      "internal", "sofmix:ctaInternal"));
        list.add(make("Lien externe (Vers un autre site)",   "external", "sofmix:ctaExternal"));

        return list;
    }

    private static ChoiceListValue make(String display, String value, String mixins) {
        Map<String, Object> props = new HashMap<>();
        // Jahia lira cette chaîne et ajoutera tous les mixins séparés par des virgules
        props.put("addMixin", mixins); 
        return new ChoiceListValue(
            display,
            props,
            new ValueImpl(value, PropertyType.STRING, false)
        );
    }
}
