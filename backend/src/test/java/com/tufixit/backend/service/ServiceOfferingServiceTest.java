package com.tufixit.backend.service;

import com.tufixit.backend.repository.ServiceOfferingRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServiceOfferingServiceTest {

    @Test
    void publicSlugResolutionExcludesInactiveServices() {
        ServiceOfferingRepository repository = mock(ServiceOfferingRepository.class);
        ServiceOfferingService service = new ServiceOfferingService(repository);

        when(repository.findBySlugAndIsActiveTrue("drain-unblocking")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.getBySlug("drain-unblocking"));
    }
}