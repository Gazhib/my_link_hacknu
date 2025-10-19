import { Card, Group, Text, Button, Stack } from "@mantine/core";
import { Link } from "react-router-dom";

interface PreviewCardProps {
  imageUrl?: string;
  companyName?: string;
  vacancyTitle?: string;
  location?: string;
  experience?: string;
  workSchedule?: string;
  employmentType?: string;
  description?: string;
  tags?: string[];
  id: string;
}

export default function PreviewCard({
  imageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeJQeJyzgAzTEVqXiGe90RGBFhfp_4RcJJMQ&s",
  companyName = "Название компании",
  vacancyTitle = "Вакансия",
  location = "Локация",
  experience = "Опыт",
  workSchedule = "График работы",
  employmentType = "Тип занятости",
  id,
}: PreviewCardProps) {
  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      padding="lg"
      className="w-[80%] h-[30%]"
    >
      <Group align="flex-start" mb="md">
        <img
          src={imageUrl}
          alt="Company Logo"
          className="w-[40px] h-[40px] rounded-full"
        />
        <Stack gap={2}>
          <Link
            to={`/vacancies/${id}`}
            style={{
              color: "#1e88e5",
              fontWeight: 500,
              textDecoration: "none",
              fontSize: "14px",
              lineHeight: "1.3",
            }}
          >
            {companyName}
          </Link>
        </Stack>
      </Group>

      <Text fw={600} size="lg" mb="sm">
        {vacancyTitle}
      </Text>

      <Stack gap={4} mb="md">
        <Text size="sm" c="dimmed">
          <Text span fw={500} c="dark">
            Город:
          </Text>{" "}
          {location}
        </Text>
        <Text size="sm" c="dimmed">
          <Text span fw={500} c="dark">
            Опыт работы:
          </Text>{" "}
          {experience}
        </Text>
        <Text size="sm" c="dimmed">
          <Text span fw={500} c="dark">
            График работы:
          </Text>{" "}
          {workSchedule}
        </Text>
        <Text size="sm" c="dimmed">
          <Text span fw={500} c="dark">
            Тип занятости:
          </Text>{" "}
          {employmentType}
        </Text>
      </Stack>

      <Button
        component={Link}
        to={`/vacancies/${id}`}
        color="blue"
        variant="light"
        radius="md"
        fullWidth
      >
        СТРАНИЦА ВАКАНСИИ
      </Button>
    </Card>
  );
}
