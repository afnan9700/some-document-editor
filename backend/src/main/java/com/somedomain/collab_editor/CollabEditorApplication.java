package com.somedomain.collab_editor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CollabEditorApplication {

	public static void main(String[] args) {
		SpringApplication.run(CollabEditorApplication.class, args);
	}

}