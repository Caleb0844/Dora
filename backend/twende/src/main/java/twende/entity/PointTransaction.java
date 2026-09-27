package twende.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.OneToOne;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "point_transactions",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_point_transactions_place", columnNames = "place_id"),
            @UniqueConstraint(name = "uk_point_transactions_check_in", columnNames = "check_in_id")
        }
)
public class PointTransaction {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "check_in_id")
    private CheckIn checkIn;

    @Column(name = "points_delta", nullable = false)
    private int pointsDelta;

    @Column(length = 40, nullable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime createdAt;

    protected PointTransaction() {
    }

    public PointTransaction(User user, Place place, int pointsDelta, String reason) {
        this.user = user;
        this.place = place;
        this.pointsDelta = pointsDelta;
        this.reason = reason;
    }

    public PointTransaction(User user, CheckIn checkIn, int pointsDelta, String reason) {
        this.user = user;
        this.checkIn = checkIn;
        this.pointsDelta = pointsDelta;
        this.reason = reason;
    }

    public User getUser() {
        return user;
    }

    public Place getPlace() {
        return place;
    }

    public CheckIn getCheckIn() {
        return checkIn;
    }

    public int getPointsDelta() {
        return pointsDelta;
    }

    public String getReason() {
        return reason;
    }

    @PrePersist
    void beforeInsert() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}