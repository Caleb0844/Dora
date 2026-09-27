package twende.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "counties",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_counties_code", columnNames = "code"),
                @UniqueConstraint(name = "uk_counties_name", columnNames = "name")
        }
)
public class County {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(length = 3, nullable = false)
    private String code;

    @Column(length = 80, nullable = false)
    private String name;

    protected County() {
    }

    public Integer getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }
}