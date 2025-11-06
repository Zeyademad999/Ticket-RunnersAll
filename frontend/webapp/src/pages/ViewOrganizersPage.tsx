import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";

interface EventImage {
  url: string;
  isPrimary?: boolean;
}

interface EventBrief {
  id: string;
  title: string;
  titleAr?: string;
  images: EventImage[];
  date: string;
  time: string;
  location: string;
  locationAr?: string;
  rating: number;
  category: string;
}

interface Organizer {
  id: string | undefined;
  name: string;
  description: string;
  logoUrl: string;
  events: EventBrief[];
}

const ViewOrganizersPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);

  // ────────────────────────────────────────────────────────────────
  // Mock organizer & events — replace with API fetch later
  // ────────────────────────────────────────────────────────────────
  const organizer: Organizer = useMemo(
    () => ({
      id,
      name: t("organizers.mockData.organizerName"),
      description: t("organizers.organizerDescription"),
      logoUrl:
        "data:image/png;base64,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",

      events: [
        {
          id: "evt-1",
          title: t("organizers.mockData.events.concert1.title"),
          images: [{ url: "/event1.jpg", isPrimary: true }],
          date: t("organizers.mockData.events.concert1.date"),
          time: t("organizers.mockData.events.concert1.time"),
          location: t("organizers.mockData.events.concert1.location"),
          rating: 4.8,
          category: t("organizers.eventCategories.music"),
        },
        {
          id: "evt-2",
          title: t("organizers.mockData.events.concert2.title"),
          images: [{ url: "/event2.jpg", isPrimary: true }],
          date: t("organizers.mockData.events.concert2.date"),
          time: t("organizers.mockData.events.concert2.time"),
          location: t("organizers.mockData.events.concert2.location"),
          rating: 4.6,
          category: t("organizers.eventCategories.music"),
        },
        {
          id: "evt-3",
          title: t("organizers.mockData.events.festival1.title"),
          images: [{ url: "/event3.jpg", isPrimary: true }],
          date: t("organizers.mockData.events.festival1.date"),
          time: t("organizers.mockData.events.festival1.time"),
          location: t("organizers.mockData.events.festival1.location"),
          rating: 4.9,
          category: t("organizers.eventCategories.festival"),
        },
      ],
    }),
    [id, t]
  );

  // Navigate handlers
  const goToEvent = (eventId: string) => navigate(`/event/${eventId}`);
  const goToExpiredEvent = (eventId: string) => navigate(`/expired-event`);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Organizer Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <img
            src={organizer.logoUrl}
            alt={organizer.name}
            className="w-24 h-24 mx-auto mb-4 object-cover rounded-lg shadow-lg"
          />
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            {organizer.name}
          </h1>
          <p className="text-muted-foreground max-w-prose mx-auto leading-relaxed">
            {organizer.description}
          </p>
        </div>

        {/* Upcoming Events Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {t("organizers.Utitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizer.events.map((evt) => (
              <div
                key={evt.id}
                className="card-elevated rounded-xl overflow-hidden hover-scale cursor-pointer"
                onClick={() => goToEvent(evt.id)}
              >
                {/* Event Image / Carousel (single image here) */}
                {evt.images && evt.images.length > 0 ? (
                  <Swiper
                    modules={[Navigation, Pagination]}
                    pagination={{ clickable: true }}
                    navigation
                    loop={false}
                    slidesPerView={1}
                    className="h-56 w-full"
                  >
                    {evt.images.map((img, idx) => (
                      <SwiperSlide key={idx} className="h-full">
                        <img
                          src={img.url}
                          alt={evt.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const placeholderDiv =
                              document.createElement("div");
                            placeholderDiv.className =
                              "w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground";
                            placeholderDiv.innerHTML =
                              '<div class="text-center p-4">' +
                              '<div class="text-lg font-semibold text-foreground mb-2">' +
                              t("eventDetail.noMediaAvailable") +
                              "</div>" +
                              '<div class="text-xs text-muted-foreground">' +
                              t("eventDetail.noMediaDescription") +
                              "</div>" +
                              "</div>";
                            target.parentNode?.appendChild(placeholderDiv);
                          }}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="h-56 w-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                    <div className="text-center p-4">
                      <div className="text-lg font-semibold text-foreground mb-2">
                        {t("eventDetail.noMediaAvailable")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("eventDetail.noMediaDescription")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 min-h-[48px]">
                    {evt.title}
                  </h3>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("organizers.date")}: {evt.date}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t("organizers.time")}: {evt.time}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {t("organizers.location")}: {evt.location}
                    </span>
                  </div>

                  {/* Category and Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <Badge variant="secondary" className="w-fit">
                      {evt.category}
                    </Badge>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent parent onClick
                          navigate(`/booking/${evt.id}`);
                        }}
                      >
                        {t("buttons.book_now")}
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${evt.id}`);
                        }}
                      >
                        {t("buttons.view_event")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* former Events Section */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {t("organizers.Ftitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizer.events.map((evt) => (
              <div
                key={evt.id}
                className="card-elevated rounded-xl overflow-hidden hover-scale cursor-pointer"
                onClick={() => goToExpiredEvent(evt.id)}
              >
                {/* Event Image / Carousel (single image here) */}
                <Swiper
                  modules={[Navigation, Pagination]}
                  pagination={{ clickable: true }}
                  navigation
                  loop={false}
                  slidesPerView={1}
                  className="h-56 w-full"
                >
                  {evt.images.map((img, idx) => (
                    <SwiperSlide key={idx} className="h-full">
                      <img
                        src={img.url}
                        alt={evt.title}
                        className="w-full h-full object-cover"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Event Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 min-h-[48px]">
                    {evt.title}
                  </h3>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("organizers.date")}: {evt.date}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t("organizers.time")}: {evt.time}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {t("organizers.location")}: {evt.location}
                    </span>
                  </div>

                  {/* Category Badge */}
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary">{evt.category}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ViewOrganizersPage;
