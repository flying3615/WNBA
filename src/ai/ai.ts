import {Configuration, OpenAIApi} from "openai";


const configuration = new Configuration({
    // apiKey: process.env.OPENAI_API_KEY,
    apiKey: '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',
});
const openai = new OpenAIApi(configuration);


const inputData = [
    {
        "courtId": "5aadd66e87c6b800048a290d",
        "bookingTimes": [
            {
                "startDate": "2023-07-03T12:00:00.000Z",
                "endDate": "2023-07-03T14:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T06:00:00.000Z",
                "endDate": "2023-07-04T08:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T08:00:00.000Z",
                "endDate": "2023-07-04T09:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T09:00:00.000Z",
                "endDate": "2023-07-04T10:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T10:00:00.000Z",
                "endDate": "2023-07-04T11:30:00.000Z",
            }
        ]
    },
    {
        "courtId": "5aadd66e87c6b800048a290e",
        "bookingTimes": [
            {
                "startDate": "2023-07-03T12:00:00.000Z",
                "endDate": "2023-07-03T14:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T06:00:00.000Z",
                "endDate": "2023-07-04T08:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T03:30:00.000Z",
                "endDate": "2023-07-04T04:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T04:00:00.000Z",
                "endDate": "2023-07-04T04:30:00.000Z",
            },
            {
                "startDate": "2023-07-04T04:30:00.000Z",
                "endDate": "2023-07-04T05:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T08:00:00.000Z",
                "endDate": "2023-07-04T09:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T09:00:00.000Z",
                "endDate": "2023-07-04T10:00:00.000Z",
            },
            {
                "startDate": "2023-07-04T10:00:00.000Z",
                "endDate": "2023-07-04T11:30:00.000Z",
            }
        ]
    },
    ]

const prompt = `
    Your task is to find out which venue in the given data has the longest bookable time between 7:00 and 11:30 on that day, and output the available start and end times;
    The time format is "yyyy-MM-ddTHH:mm:sssZ", for example "2023-07-03T07:00:00.000Z";
    It is 7 o'clock on July 3, 2023. When different dates appear in the given data, the latest date is used as the standard. The 4th shall prevail, regardless of the data on July 3, 2023;
    The time data takes half an hour as a unit;
    When the available start time is found to be equal to or later than 11:30, output an empty array and do not fabricate the data;

    Input data description:
    The input data is separated by three quotation marks, and the format is JSON:
    The key is "courtId", the value is the venue id,
    The key is "bookingTimes", the value is an array of time slots that the venue has been booked for, and it is the unavailable time,
    time period object
    The key is "startDate", the value is the start time, the key is "endDate", the value is the end time,
    
    example：
    {
        "courtId": "abc",
        "bookingTimes": [
            {
                "startDate": "2022-06-03T12:00:00.000Z",
                "endDate": "2022-06-03T14:00:00.000Z",
            },
            {
                "startDate": "2022-06-04T06:00:00.000Z",
                "endDate": "2022-06-04T08:00:00.000Z",
            }
            {
                "startDate": "2022-06-04T08:00:00.000Z",
                "endDate": "2022-06-04T11:00:00.000Z",
            }
        ]
    }
    Let's think step by step how to solve this problem,
    In the first step, we filter the data and only find the latest data on June 4, 2023;
    In the second step, it is necessary to find out the reserved time slot as the unavailable time slot. The unavailable time slots of the venue are: 6:00 to 8:00, 8:00 to 11:00;
    The third step, so within the required time range of 7:00 to 11:30, the available time period is 11:00 to 11:30;
    Then the output is as follows:
     {
        "courtId": "abc",
        "bookingTimes": [
            {
                "freeStartDate": "2023-07-04T011:00:00.000Z",
                "freeEndDate": "2023-07-04T11:30:00.000Z",
            },
        ]
    }

    Input data: """${JSON.stringify(inputData)}"""
    
    Your output should be JSON format like below:
    [
        {
            "courtId": court id,
            "bookingTimes": [
                {
                    "freeStartDate": free start time
                    "freeEndDate": free end time,
                },
            ]
        },
   ]
`

const getChatCompletion = async (message: string) => {
    return await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: message}],
        temperature: 1
    });
}

getChatCompletion(prompt).then((res) => {
    console.log(res.data.choices[0].message);
})