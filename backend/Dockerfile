# Stage 1: Build the application
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy the POM first to cache dependencies (improves subsequent build speeds)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the source code and package the application
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create the runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Extract the compiled jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the standard Spring Boot port
EXPOSE 8080

# Execute the application
ENTRYPOINT ["java", "-jar", "app.jar"]