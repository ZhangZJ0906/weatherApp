import { Component } from '@angular/core';
import { HttpClientService } from '../../@services/http-client.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-apidemo',
  imports: [FormsModule],
  templateUrl: './apidemo.component.html',
  styleUrl: './apidemo.component.scss',
})
export class ApidemoComponent {
  constructor(private http: HttpClientService) {}
  oneHourData!: any;
  threeHourData!: any;
  city!: string;
  area!: any[];
  location!: any;
  choseArea!: any;
  data!: any[];
  dayOptions!: string[]; // 下拉三天
  selectedDay!: string; // 目前選擇
  filteredData!: any[]; // 顯示資料
  //今天data
  currentTemp!: string;
  currentAppTemp!: number;
  currentWeather!: string;
  currentWeatherDesc!: string;
  currentTime!: string;
  currentWeathercode!: string;
  currentProbabilityOfPrecipitation!:string;

  // 抓後三天
  getNext3Days() {
    const days = [];
    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dateStr = d.toISOString().slice(0, 10);
      days.push(dateStr);
    }

    return days;
  }
  // 未來資料
  filterByDay(day: string) {
    // 1️⃣ 逐小時
    const oneHour = this.oneHourData.filter((item: any) =>
      item.time.startsWith(day),
    );

    // 2️⃣ 三小時區間
    const threeHour = this.threeHourData.filter((item: any) =>
      item.startTime.startsWith(day),
    );

    // 3️⃣ 合併資料
    this.filteredData = oneHour.map((hour: any) => {
      const three = threeHour.find((item: any) => {
        const start = new Date(item.startTime).getTime();
        const end = new Date(item.endTime).getTime();
        const time = new Date(hour.time).getTime();

        return time >= start && time < end;
      });

      return {
        ...hour,
        weather: three?.weather ?? '',
        weatherDes: three?.weatherDes ?? '',
        weatherCode: three?.weatherCode ?? '01',
        probabilityOfPrecipitation: three?.probabilityOfPrecipitation,
      };
    });
  }
  // 顯示現在資料
  updateCurrentWeather() {
    if (!this.oneHourData?.length || !this.threeHourData?.length) return;

    const now = Date.now();

    // =========================
    // 1小時溫度（抓最近一筆 <= now）
    // =========================
    let hour = this.oneHourData
      .slice() // 不污染原陣列
      .reverse() // 從最新往前找
      .find((item: any) => new Date(item.time).getTime() <= now);

    // ⭐ 如果現在比第一筆還早（像你 11:39 < 12:00）
    if (!hour) {
      hour = this.oneHourData[0];
    }

    this.currentTemp = hour.temperature;
    this.currentAppTemp = hour.apparentTemperature;
    this.currentTime = hour.time;

    // =========================
    // 3小時天氣（區間比對）
    // =========================
    let three = this.threeHourData.find((item: any) => {
      const start = new Date(item.startTime).getTime();
      const end = new Date(item.endTime).getTime();
      return now >= start && now < end;
    });

    // ⭐ 如果沒命中（例如資料全部未來）
    if (!three) {
      three = this.threeHourData[0];
    }

    this.currentWeather = three.weather;
    this.currentWeatherDesc = three.weatherDes;
    this.currentWeathercode = three.weatherCode;
    this.currentProbabilityOfPrecipitation = three.probabilityOfPrecipitation;
  }

  areaChange(change: string) {
    this.data = this.location.find(
      (element: any) => element.LocationName === change,
    );
    this.group(this.data);
    this.filterByDay(this.selectedDay);
    this.updateCurrentWeather();
    // console.log('teas',this.data)
  }
  //時間格式化
  formatTime(dateStr: string) {
    const d = new Date(dateStr);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
      2,
      '0',
    )}:00`;
  }
  //整理API返還資料
  group(data: any) {
    let test = [];
    let threetest = [];
    for (let i = 0; i < data.WeatherElement[0].Time.length; i++) {
      let item = {
        time: this.formatTime(data.WeatherElement[0].Time[i].DataTime), //抓共同時間
        temperature: data.WeatherElement[0].Time[i].ElementValue[0].Temperature, //溫度
        apparentTemperatureName: data.WeatherElement[3].ElementName, //體感溫度
        apparentTemperature:
          data.WeatherElement[3].Time[i].ElementValue[0].ApparentTemperature,
      };
      test.push(item);
    }
    for (let i = 0; i < data.WeatherElement[8].Time.length; i++) {
      let item = {
        startTime: this.formatTime(data.WeatherElement[8].Time[i].StartTime),
        endTime: this.formatTime(data.WeatherElement[8].Time[i].EndTime),
        weather: data.WeatherElement[8].Time[i].ElementValue[0].Weather,
        weatherDes:
          data.WeatherElement[9].Time[i].ElementValue[0].WeatherDescription,
        weatherCode: data.WeatherElement[8].Time[i].ElementValue[0].WeatherCode,
        probabilityOfPrecipitation:
          data.WeatherElement[7].Time[i].ElementValue[0]
            .ProbabilityOfPrecipitation,
      };
      threetest.push(item);
    }
    // console.table(threetest);
    this.oneHourData = test;
    this.threeHourData = threetest;
    // console.log(this.threeHourData)

    // console.table(test);
  }
  ngOnInit(): void {
    this.dayOptions = this.getNext3Days();
    this.selectedDay = this.dayOptions[0]; // 預設今天

    this.http
      .getApi(
        'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-065?Authorization=CWA-C947A3E5-F386-4189-B35D-7A5DAEB29BF7&limit=3&offset=3',
      )
      .subscribe((res: any) => {
        let result = res.records.Locations[0];
        this.city = result.LocationsName;
        this.location = result.Location;
        this.area = result.Location.map((test: any) => test.LocationName);
        this.choseArea = this.area[0]; //預設第一個
        this.areaChange(this.choseArea); //直接顯示
        console.log(this.location);

        // console.log(this.oneHourData);
        // console.log(this.threeHourData);
      });
  }
}
