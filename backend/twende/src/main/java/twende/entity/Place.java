package twende.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "places",
        indexes = {
                @Index(name = "ix_places_status_created", columnList = "status, created_at"),
                @Index(name = "ix_places_category", columnList = "category_id"),
                @Index(name = "ix_places_county", columnList = "county_id"),
                @Index(name = "ix_places_creator", columnList = "created_by"),
                @Index(name = "ix_places_coordinates", columnList = "latitude, longitude")
        }
)
public class Place {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(length = 120, nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "county_id", nullable = false)
    private County county;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private PlaceStatus status = PlaceStatus.PUBLISHED;

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<PlaceImage> images = new ArrayList<>();

    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime updatedAt;

    public Place() {
    }

    @PrePersist
    void beforeInsert() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void addImage(
            String imageUrl,
            String cloudinaryPublicId,
            int sortOrder
    ) {
        PlaceImage image = new PlaceImage(
                imageUrl,
                cloudinaryPublicId,
                sortOrder
        );
        image.setPlace(this);
        images.add(image);
    }

    public void addImage(String imageUrl, int sortOrder) {
        addImage(imageUrl, null, sortOrder);
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public County getCounty() {
        return county;
    }

    public void setCounty(County county) {
        this.county = county;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public PlaceStatus getStatus() {
        return status;
    }

    public void publish() {
        status = PlaceStatus.PUBLISHED;
    }

    public void archive() {
        status = PlaceStatus.ARCHIVED;
    }

    public List<PlaceImage> getImages() {
        return images;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}