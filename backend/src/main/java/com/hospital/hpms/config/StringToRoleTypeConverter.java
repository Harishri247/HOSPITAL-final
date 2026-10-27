package com.hospital.hpms.config;

import com.hospital.hpms.entity.RoleType;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StringToRoleTypeConverter implements Converter<String, RoleType> {

    @Override
    public RoleType convert(String source) {
        return RoleType.fromString(source);
    }
}
