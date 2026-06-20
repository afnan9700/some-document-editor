# Stage 1: Build the application
# Added FQDN to bypass Podman's registry search prompts
FROM docker.io/library/maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy the POM first to cache dependencies (improves subsequent build speeds)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the source code and package the application
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create the runtime image
# Added FQDN for the official Eclipse Temurin runtime
FROM docker.io/library/eclipse-temurin:21-jre-alpine
WORKDIR /app

# SECURITY OPTIMIZATION: Create a dedicated, unprivileged system user
# The -S flag denotes a 'system' user/group in Alpine Linux
RUN addgroup -S spring && adduser -S spring -G spring

# Change ownership of the directory to our new user
# Then extract the compiled jar from the builder stage
COPY --chown=spring:spring --from=builder /app/target/*.jar app.jar

# Drop root privileges for all subsequent commands and container execution
USER spring:spring

# Expose the standard Spring Boot port
EXPOSE 8080

# Execute the application
ENTRYPOINT ["java", "-jar", "app.jar"]