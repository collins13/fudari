package com.tufixit.backend.security;

import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private UserRepository userRepository;

    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (!StringUtils.hasText(username)) {
            throw new UsernameNotFoundException("User not found with: " + username);
        }

        String normalizedUsername = username.trim();
        User user = userRepository.findByEmail(normalizedUsername)
            .orElseGet(() -> userRepository.findByPhoneNumber(normalizedUsername)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with: " + normalizedUsername)));

        String principal = StringUtils.hasText(user.getEmail()) ? user.getEmail() : user.getPhoneNumber();
        return new org.springframework.security.core.userdetails.User(
                principal,
                user.getPassword(),
                user.getIsActive(),
                true,
                true,
                true,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    public User getUserByPhone(String phone) {
        return userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with phone: " + phone));
    }
}
