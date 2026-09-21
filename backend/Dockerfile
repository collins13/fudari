FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring \
	&& apk add --no-cache wget
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
USER spring
CMD ["java", "-jar", "app.jar"]
