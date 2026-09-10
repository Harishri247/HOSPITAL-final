package com.hospital.hpms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class HpmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(HpmsApplication.class, args);
    }
}
