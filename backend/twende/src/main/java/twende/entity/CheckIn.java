package twende.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "check_ins",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_check_ins_user_place",
                columnNames = {"user_id", "place_id"}
        ),
        indexes = @Index(name = "ix_check_ins_place_time", columnList = "place_id, checked_in_at")
)
public class CheckIn {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Column(name = "checked_in_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime checkedInAt;

    protected CheckIn() {
    }

    public CheckIn(User user, Place place) {
        this.user = user;
        this.place = place;
    }

    @PrePersist
    void beforeInsert() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        checkedInAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public String getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Place getPlace() {
        return place;
    }

    public LocalDateTime getCheckedInAt() {
        return checkedInAt;
    }
}